import type {
	SyncProvider,
	SyncConfig,
	SyncMapping,
	ExternalEvent,
	SyncResult,
	SyncDirection,
	ProviderType
} from './types';
import { db } from '../db';
import {
	syncConfig as syncConfigTable,
	syncOperation as syncOperationTable,
	syncMapping as syncMappingTable,
	webhookSubscription as webhookSubscriptionTable,
	event as eventTable
} from '../db/schema';
import { eq, and, isNull, lt, inArray, desc } from 'drizzle-orm';
import { GoogleCalendarProvider } from './providers/google-calendar';
import crypto from 'crypto';
import { env } from '$env/dynamic/private';
import { globalEvents } from '../events';

/**
 * Central sync service orchestrator
 * Manages provider instances and coordinates sync operations
 */
export class SyncService {
	private providers = new Map<ProviderType, new () => SyncProvider>();

	constructor() {
		// Register built-in providers
		this.registerProvider('google-calendar', GoogleCalendarProvider);
	}

	/**
	 * Register a new sync provider
	 */
	registerProvider(type: ProviderType, providerClass: new () => SyncProvider): void {
		this.providers.set(type, providerClass);
	}

	/**
	 * Get provider instance for a sync config
	 */
	private async getProviderInstance(config: SyncConfig): Promise<SyncProvider> {
		const ProviderClass = this.providers.get(config.providerType);
		if (!ProviderClass) {
			throw new Error(`Unknown provider type: ${config.providerType}`);
		}

		const provider = new ProviderClass();
		await provider.initialize(config);

		return provider;
	}

	/**
	 * Convert database row to SyncConfig type
	 */
	private rowToConfig(row: typeof syncConfigTable.$inferSelect): SyncConfig {
		return {
			id: row.id,
			userId: row.userId,
			providerId: row.providerId,
			providerType: row.providerType as ProviderType,
			direction: row.direction as SyncDirection,
			enabled: row.enabled,
			credentials: row.credentials as Record<string, any> | undefined,
			settings: row.settings as Record<string, any> | undefined,
			lastSyncAt: row.lastSyncAt ?? undefined,
			nextSyncAt: row.nextSyncAt ?? undefined,
			syncToken: row.syncToken ?? undefined,
			webhookId: row.webhookId ?? undefined,
			createdAt: row.createdAt,
			updatedAt: row.updatedAt
		};
	}

	/**
	 * Sync events for a specific configuration
	 * Handles bidirectional sync (pull from provider, push local changes)
	 */
	async syncEvents(configId: string): Promise<SyncResult> {
		console.log(`[SyncService] Starting sync for config: ${configId}`);
		const result: SyncResult = {
			success: true,
			pulled: 0,
			pushed: 0,
			errors: []
		};

		let operationId: string | undefined;

		try {
			// Get sync config
			console.log(`[SyncService] Fetching sync config from database...`);
			const [configRow] = await db
				.select()
				.from(syncConfigTable)
				.where(and(eq(syncConfigTable.id, configId), eq(syncConfigTable.enabled, true)));

			if (!configRow) {
				console.error(`[SyncService] Sync config not found or disabled: ${configId}`);
				throw new Error(`Sync config not found or disabled: ${configId}`);
			}

			const config = this.rowToConfig(configRow);
			console.log(`[SyncService] Config loaded:`, {
				id: config.id,
				providerType: config.providerType,
				direction: config.direction,
				enabled: config.enabled,
				lastSyncAt: config.lastSyncAt,
				syncToken: config.syncToken ? 'present' : 'absent',
				credentials: config.credentials ? 'present' : 'absent'
			});

			// Create operation record
			operationId = crypto.randomUUID();
			console.log(`[SyncService] Creating operation record: ${operationId}`);
			await db.insert(syncOperationTable).values({
				id: operationId,
				syncConfigId: configId,
				operation: 'pull',
				status: 'pending',
				entityType: 'event',
				startedAt: new Date()
			});

			// Initialize provider
			console.log(`[SyncService] Initializing provider: ${config.providerType}`);
			const provider = await this.getProviderInstance(config);
			console.log(`[SyncService] Provider initialized successfully`);

			// Pull events from provider
			if (config.direction === 'pull' || config.direction === 'bidirectional') {
				console.log(`[SyncService] Starting pull operation...`);
				const pullResult = await this.pullFromProvider(config, provider);
				result.pulled = pullResult.pulled;
				result.errors.push(...pullResult.errors);
				console.log(`[SyncService] Pull completed: ${pullResult.pulled} events, ${pullResult.errors.length} errors`);
			}

			// Push local changes to provider
			if (config.direction === 'push' || config.direction === 'bidirectional') {
				console.log(`[SyncService] Starting push operation...`);
				const pushResult = await this.pushToProvider(config, provider);
				result.pushed = pushResult.pushed;
				result.errors.push(...pushResult.errors);
				console.log(`[SyncService] Push completed: ${pushResult.pushed} events, ${pushResult.errors.length} errors`);
			}

			// Update operation status
			console.log(`[SyncService] Updating operation status...`);
			await db
				.update(syncOperationTable)
				.set({
					status: result.errors.length > 0 ? 'failed' : 'completed',
					completedAt: new Date(),
					error: result.errors.length > 0 ? JSON.stringify(result.errors) : null
				})
				.where(eq(syncOperationTable.id, operationId));

			// Update sync config with last sync time
			console.log(`[SyncService] Updating sync config...`);
			await db
				.update(syncConfigTable)
				.set({
					lastSyncAt: new Date(),
					nextSyncAt: this.calculateNextSync(config)
				})
				.where(eq(syncConfigTable.id, configId));

			result.success = result.errors.length === 0;
			console.log(`[SyncService] Sync completed successfully:`, result);
			return result;
		} catch (error: any) {
			console.error(`[SyncService] Sync failed with error:`, error);
			console.error(`[SyncService] Error stack:`, error.stack);
			result.success = false;
			result.errors.push({ message: error.message });

			// Update operation as failed if we created one
			if (operationId) {
				console.log(`[SyncService] Marking operation as failed: ${operationId}`);
				await db
					.update(syncOperationTable)
					.set({
						status: 'failed',
						completedAt: new Date(),
						error: `${error.message}\n\nStack:\n${error.stack}`
					})
					.where(eq(syncOperationTable.id, operationId));
			}

			throw error;
		}
	}

	/**
	 * Pull events from external provider and update local database
	 */
	private async pullFromProvider(
		config: SyncConfig,
		provider: SyncProvider
	): Promise<{ pulled: number; errors: SyncResult['errors'] }> {
		const result = { pulled: 0, errors: [] as SyncResult['errors'] };

		try {
			console.log(`[SyncService] Pulling events from provider, syncToken: ${config.syncToken ? 'present' : 'absent'}`);

			// Pull events using sync token if available
			const { events, nextSyncToken } = await provider.pullEvents(config.syncToken);

			console.log(`[SyncService] Received ${events.length} events from provider`);
			console.log(`[SyncService] Next sync token: ${nextSyncToken ? 'present' : 'absent'}`);

			for (const externalEvent of events) {
				try {
					console.log(`[SyncService] Processing event: ${externalEvent.externalId} - ${externalEvent.summary}`);
					await this.processExternalEvent(config, externalEvent);
					result.pulled++;
				} catch (error: any) {
					console.error(`[SyncService] Failed to process event ${externalEvent.externalId}:`, error);
					result.errors.push({
						externalId: externalEvent.externalId,
						message: `Failed to process event ${externalEvent.externalId}: ${error.message}`
					});
				}
			}

			// Store new sync token for incremental syncs
			if (nextSyncToken) {
				console.log(`[SyncService] Storing new sync token`);
				await db
					.update(syncConfigTable)
					.set({ syncToken: nextSyncToken })
					.where(eq(syncConfigTable.id, config.id));
			}
		} catch (error: any) {
			console.error(`[SyncService] Pull operation failed:`, error);
			console.error(`[SyncService] Error details:`, {
				message: error.message,
				code: error.code,
				status: error.status,
				stack: error.stack
			});
			result.errors.push({
				message: `Pull failed: ${error.message}${error.code ? ` (code: ${error.code})` : ''}${error.status ? ` (status: ${error.status})` : ''}`
			});
		}

		return result;
	}

	/**
	 * Push local event changes to external provider
	 */
	private async pushToProvider(
		config: SyncConfig,
		provider: SyncProvider
	): Promise<{ pushed: number; errors: SyncResult['errors'] }> {
		const result = { pushed: 0, errors: [] as SyncResult['errors'] };

		try {
			// Find local events that need to be pushed (no mapping exists)
			const unmappedEvents = await db
				.select({ event: eventTable })
				.from(eventTable)
				.leftJoin(syncMappingTable, eq(eventTable.id, syncMappingTable.eventId))
				.where(and(eq(eventTable.userId, config.userId), isNull(syncMappingTable.eventId)));

			for (const { event } of unmappedEvents) {
				try {
					const externalEvent = this.mapInternalToExternal(event, config.providerType);
					const { externalId, etag } = await provider.pushEvent(externalEvent);

					await db.insert(syncMappingTable).values({
						id: crypto.randomUUID(),
						syncConfigId: config.id,
						eventId: event.id,
						externalId: externalId,
						providerId: config.providerId,
						etag: etag ?? null,
						lastSyncedAt: new Date()
					});

					result.pushed++;
				} catch (error: any) {
					result.errors.push({
						entityId: event.id,
						message: `Failed to push event ${event.id}: ${error.message}`
					});
				}
			}

			// Push updates to already-mapped events
			const mappedEvents = await db
				.select({ event: eventTable, mapping: syncMappingTable })
				.from(eventTable)
				.innerJoin(syncMappingTable, eq(eventTable.id, syncMappingTable.eventId))
				.where(and(eq(eventTable.userId, config.userId), eq(syncMappingTable.syncConfigId, config.id)));

			for (const { event, mapping } of mappedEvents) {
				try {
					// Skip if not modified since last sync
					if (mapping.lastSyncedAt && event.updatedAt <= mapping.lastSyncedAt) {
						continue;
					}

					const externalEvent = this.mapInternalToExternal(event, config.providerType);
					const { etag } = await provider.updateEvent(mapping.externalId, externalEvent);

					await db
						.update(syncMappingTable)
						.set({ etag: etag ?? null, lastSyncedAt: new Date() })
						.where(eq(syncMappingTable.id, mapping.id));

					result.pushed++;
				} catch (error: any) {
					result.errors.push({
						entityId: event.id,
						externalId: mapping.externalId,
						message: `Failed to update event ${event.id}: ${error.message}`
					});
				}
			}
		} catch (error: any) {
			result.errors.push({ message: `Push failed: ${error.message}` });
		}

		return result;
	}

	/**
	 * Process an external event from a provider (create or update local event)
	 */
	private async processExternalEvent(config: SyncConfig, externalEvent: ExternalEvent): Promise<void> {
		// First, check if we have a mapping for this external event
		const [mapping] = await db
			.select()
			.from(syncMappingTable)
			.where(
				and(
					eq(syncMappingTable.syncConfigId, config.id),
					eq(syncMappingTable.externalId, externalEvent.externalId)
				)
			);

		if (externalEvent.status === 'cancelled') {
			if (mapping) {
				console.log(`[SyncService] Received cancellation for external event ${externalEvent.externalId}, deleting local event ${mapping.eventId}`);

				// Delete the local event
				// Note: This might trigger a delete hook if we had one, but we don't.
				// However, we should be careful not to trigger a push-back loop if we add one later.
				await db.delete(eventTable).where(eq(eventTable.id, mapping.eventId));

				// Mapping should be deleted by cascade if foreign key exists, but let's be safe
				await db.delete(syncMappingTable).where(eq(syncMappingTable.id, mapping.id));

				// Emit event-deleted event for real-time updates
				globalEvents.emit('event-deleted', {
					userId: config.userId,
					eventId: mapping.eventId,
					source: 'sync'
				});
			} else {
				console.log(`[SyncService] Received cancellation for unknown external event ${externalEvent.externalId}, ignoring`);
			}
			return;
		}

		if (mapping) {
			// Update existing event
			console.log(`[SyncService] Updating existing local event ${mapping.eventId} from external ${externalEvent.externalId}`);

			// Get current event to check timestamps
			const [currentEvent] = await db
				.select()
				.from(eventTable)
				.where(eq(eventTable.id, mapping.eventId));

			if (currentEvent) {
				// Skip update if we just modified it locally (within last 30 seconds)
				// This prevents echo loops in bidirectional sync
				const timeSinceUpdate = Date.now() - currentEvent.updatedAt.getTime();
				if (timeSinceUpdate < 30000) {
					console.log(`[SyncService] Skipping update for ${mapping.eventId} - recently modified locally (${timeSinceUpdate}ms ago)`);

					// Still update the mapping timestamp to prevent re-processing
					await db
						.update(syncMappingTable)
						.set({ etag: externalEvent.etag ?? null, lastSyncedAt: new Date() })
						.where(eq(syncMappingTable.id, mapping.id));
					return;
				}
			}

			const internalEvent = this.mapExternalToInternal(externalEvent, config.userId);

			await db
				.update(eventTable)
				.set({ ...internalEvent, updatedAt: new Date() })
				.where(eq(eventTable.id, mapping.eventId));

			await db
				.update(syncMappingTable)
				.set({ etag: externalEvent.etag ?? null, lastSyncedAt: new Date() })
				.where(eq(syncMappingTable.id, mapping.id));

			// Emit event-updated event for real-time updates
			globalEvents.emit('event-updated', {
				userId: config.userId,
				eventId: mapping.eventId,
				source: 'sync'
			});
		} else {
			// Before creating a new event, check if we already have a local event with similar properties
			// that was just created (within last 30 seconds). This prevents duplicates when:
			// 1. User creates event locally → pushes to Google → webhook fires → tries to pull back
			console.log(`[SyncService] Checking for recently created local events before creating new one`);
			console.log(`[SyncService] External event details:`, {
				summary: externalEvent.summary,
				startDateTime: externalEvent.startDateTime,
				startDate: externalEvent.startDate,
				externalId: externalEvent.externalId
			});

			const recentEvents = await db
				.select()
				.from(eventTable)
				.where(
					and(
						eq(eventTable.userId, config.userId),
						eq(eventTable.summary, externalEvent.summary)
					)
				);

			console.log(`[SyncService] Found ${recentEvents.length} candidates with same summary`);

			// Check if any recent event matches this external event
			for (const recentEvent of recentEvents) {
				const timeSinceCreation = Date.now() - recentEvent.createdAt.getTime();
				console.log(`[SyncService] Checking candidate ${recentEvent.id}:`, {
					timeSinceCreation,
					startDateTime: recentEvent.startDateTime,
					startDate: recentEvent.startDate
				});

				// If we find a very recently created event with same summary and similar time
				if (timeSinceCreation < 60000) { // Increased window to 60s
					// Compare times more robustly
					let startTimesMatch = false;

					if (recentEvent.startDate && externalEvent.startDate) {
						startTimesMatch = recentEvent.startDate === externalEvent.startDate;
					} else if (recentEvent.startDateTime && externalEvent.startDateTime) {
						// Compare timestamps to handle timezone differences
						const t1 = recentEvent.startDateTime.getTime();
						const t2 = externalEvent.startDateTime.getTime();
						// Allow 1 second difference
						startTimesMatch = Math.abs(t1 - t2) < 1000;
					} else if (recentEvent.startDateTime && externalEvent.startDate) {
						// Cross-type match: Local is timed, External is all-day
						// Check if the timed event falls on the all-day date
						const localDate = recentEvent.startDateTime.toISOString().split('T')[0];
						startTimesMatch = localDate === externalEvent.startDate;
					} else if (recentEvent.startDate && externalEvent.startDateTime) {
						// Cross-type match: Local is all-day, External is timed
						const externalDate = externalEvent.startDateTime.toISOString().split('T')[0];
						startTimesMatch = recentEvent.startDate === externalDate;
					}

					console.log(`[SyncService] Match result for ${recentEvent.id}:`, { startTimesMatch });

					if (startTimesMatch) {
						console.log(`[SyncService] Found matching recent local event ${recentEvent.id}, creating mapping instead of duplicate`);

						// Create mapping to link this local event to the external one
						await db.insert(syncMappingTable).values({
							id: crypto.randomUUID(),
							syncConfigId: config.id,
							eventId: recentEvent.id,
							externalId: externalEvent.externalId,
							providerId: config.providerId,
							etag: externalEvent.etag ?? null,
							lastSyncedAt: new Date()
						});

						return; // Don't create duplicate
					}
				}
			}

			// Create new event - no matching local event found
			console.log(`[SyncService] Creating new local event from external ${externalEvent.externalId}`);
			const internalEvent = this.mapExternalToInternal(externalEvent, config.userId);
			const [newEvent] = await db.insert(eventTable).values(internalEvent).returning();

			await db.insert(syncMappingTable).values({
				id: crypto.randomUUID(),
				syncConfigId: config.id,
				eventId: newEvent.id,
				externalId: externalEvent.externalId,
				providerId: config.providerId,
				etag: externalEvent.etag ?? null,
				lastSyncedAt: new Date()
			});

			// Emit event-created event for real-time updates
			globalEvents.emit('event-created', {
				userId: config.userId,
				eventId: newEvent.id,
				source: 'sync'
			});
		}
	}

	/**
	 * Handle incoming webhook notification
	 */
	async handleWebhook(
		providerId: ProviderType,
		payload: any
	): Promise<{ configId: string; processed: boolean }> {
		const configs = await db
			.select()
			.from(syncConfigTable)
			.where(and(eq(syncConfigTable.providerType, providerId), eq(syncConfigTable.enabled, true)));

		for (const configRow of configs) {
			// Trigger async sync (don't await - run in background)
			this.syncEvents(configRow.id).catch((error) => {
				console.error(`Webhook-triggered sync failed for config ${configRow.id}:`, error);
			});
		}

		return {
			configId: configs[0]?.id || '',
			processed: true
		};
	}

	/**
	 * Setup webhook for a sync config
	 */
	async setupWebhook(configId: string): Promise<void> {
		console.log(`[SyncService] Setting up webhook for config: ${configId}`);

		const [configRow] = await db.select().from(syncConfigTable).where(eq(syncConfigTable.id, configId));

		if (!configRow) {
			throw new Error(`Sync config not found: ${configId}`);
		}

		const config = this.rowToConfig(configRow);
		const provider = await this.getProviderInstance(config);

		if (!provider.supportsWebhooks) {
			console.log(`[SyncService] Provider ${config.providerType} does not support webhooks`);
			return;
		}

		// Cancel existing webhooks
		// Cancel existing webhooks
		await this.removeWebhook(configId);

		// Construct callback URL
		const baseUrl = env.BETTER_AUTH_URL || 'https://localhost:5173';
		const callbackUrl = `${baseUrl}/api/sync/webhook/${config.providerType}`;

		console.log(`[SyncService] Creating webhook subscription with callback: ${callbackUrl}`);

		// Setup new webhook
		if (provider.setupWebhook) {
			const subscription = await provider.setupWebhook(callbackUrl);

			if (subscription) {
				await db.insert(webhookSubscriptionTable).values(subscription);
				await db
					.update(syncConfigTable)
					.set({ webhookId: subscription.id })
					.where(eq(syncConfigTable.id, configId));

				console.log(`[SyncService] Webhook setup completed:`, {
					subscriptionId: subscription.id,
					channelId: subscription.channelId,
					expiresAt: subscription.expiresAt
				});
			}
		}
	}


	/**
	 * Remove webhook for a sync config
	 */
	async removeWebhook(configId: string): Promise<void> {
		console.log(`[SyncService] Removing webhook for config: ${configId}`);

		const [configRow] = await db.select().from(syncConfigTable).where(eq(syncConfigTable.id, configId));
		if (!configRow) return;

		const config = this.rowToConfig(configRow);

		// We try to get the provider, but if it fails (e.g. auth error), we still want to delete the subscription from DB
		let provider: SyncProvider | undefined;
		try {
			provider = await this.getProviderInstance(config);
		} catch (e) {
			console.warn(`[SyncService] Could not get provider instance while removing webhook:`, e);
		}

		const existingSubscriptions = await db
			.select()
			.from(webhookSubscriptionTable)
			.where(eq(webhookSubscriptionTable.syncConfigId, configId));

		for (const sub of existingSubscriptions) {
			try {
				if (provider && provider.cancelWebhook) {
					await provider.cancelWebhook(sub);
				}
			} catch (error) {
				console.error('Failed to cancel existing webhook:', error);
			}
			await db.delete(webhookSubscriptionTable).where(eq(webhookSubscriptionTable.id, sub.id));
		}

		await db
			.update(syncConfigTable)
			.set({ webhookId: null })
			.where(eq(syncConfigTable.id, configId));
	}

	/**
	 * Check webhook status for a sync config
	 */
	async checkWebhookStatus(configId: string): Promise<{ active: boolean; expiresAt?: Date }> {
		const [subscription] = await db
			.select()
			.from(webhookSubscriptionTable)
			.where(eq(webhookSubscriptionTable.syncConfigId, configId))
			.orderBy(desc(webhookSubscriptionTable.createdAt))
			.limit(1);

		if (!subscription) {
			return { active: false };
		}

		const now = new Date();
		if (subscription.expiresAt < now) {
			return { active: false, expiresAt: subscription.expiresAt };
		}

		return { active: true, expiresAt: subscription.expiresAt };
	}

	/**
	 * Renew expiring webhooks
	 * Should be called periodically (e.g., daily cron job)
	 */
	async renewWebhooks(): Promise<void> {
		console.log(`[SyncService] Checking for expiring webhooks...`);

		const expiringDate = new Date();
		expiringDate.setHours(expiringDate.getHours() + 24);

		const expiring = await db
			.select()
			.from(webhookSubscriptionTable)
			.where(lt(webhookSubscriptionTable.expiresAt, expiringDate));

		console.log(`[SyncService] Found ${expiring.length} expiring webhooks`);

		for (const subscription of expiring) {
			try {
				console.log(`[SyncService] Renewing webhook: ${subscription.id}`);

				const [configRow] = await db
					.select()
					.from(syncConfigTable)
					.where(eq(syncConfigTable.id, subscription.syncConfigId));

				if (!configRow || !configRow.enabled) {
					console.log(`[SyncService] Sync config disabled or not found, deleting webhook: ${subscription.id}`);
					await db
						.delete(webhookSubscriptionTable)
						.where(eq(webhookSubscriptionTable.id, subscription.id));
					continue;
				}

				const config = this.rowToConfig(configRow);
				const provider = await this.getProviderInstance(config);

				if (!provider.supportsWebhooks || !provider.renewWebhook) {
					console.log(`[SyncService] Provider does not support webhook renewal`);
					continue;
				}

				const newSubscription = await provider.renewWebhook(subscription);

				if (newSubscription) {
					// Delete old subscription
					await db
						.delete(webhookSubscriptionTable)
						.where(eq(webhookSubscriptionTable.id, subscription.id));

					// Insert new subscription
					await db.insert(webhookSubscriptionTable).values(newSubscription);

					// Update sync config with new webhook ID
					await db
						.update(syncConfigTable)
						.set({ webhookId: newSubscription.id })
						.where(eq(syncConfigTable.id, config.id));

					console.log(`[SyncService] Webhook renewed: ${subscription.id}, new expiry: ${newSubscription.expiresAt}`);
				}
			} catch (error: any) {
				console.error(`[SyncService] Failed to renew webhook for subscription ${subscription.id}:`, error);
			}
		}

		console.log(`[SyncService] Webhook renewal completed`);
	}

	/**
	 * Map external event to internal event format
	 */
	private mapExternalToInternal(
		external: ExternalEvent,
		userId: string
	): typeof eventTable.$inferInsert {
		return {
			id: crypto.randomUUID(),
			userId,
			summary: external.summary,
			description: external.description ?? null,
			location: external.location ?? null,
			startDate: external.startDate ?? null,
			startDateTime: external.startDateTime ?? null,
			startTimeZone: external.startTimeZone ?? null,
			endDate: external.endDate ?? null,
			endDateTime: external.endDateTime ?? null,
			endTimeZone: external.endTimeZone ?? null,
			attendees: external.attendees ?? null,
			recurrence: external.recurrence ?? null,
			reminders: external.reminders ?? null,
			createdAt: new Date(),
			updatedAt: new Date()
		};
	}

	/**
	 * Map internal event to external event format
	 */
	private mapInternalToExternal(
		internal: typeof eventTable.$inferSelect,
		providerId: ProviderType
	): ExternalEvent {
		return {
			externalId: '',
			providerId,
			summary: internal.summary,
			description: internal.description ?? undefined,
			location: internal.location ?? undefined,
			startDate: internal.startDate ?? undefined,
			startDateTime: internal.startDateTime ?? undefined,
			startTimeZone: internal.startTimeZone ?? undefined,
			endDate: internal.endDate ?? undefined,
			endDateTime: internal.endDateTime ?? undefined,
			endTimeZone: internal.endTimeZone ?? undefined,
			attendees: (internal.attendees as any) ?? undefined,
			recurrence: (internal.recurrence as any) ?? undefined,
			reminders: (internal.reminders as any) ?? undefined
		};
	}

	/**
	 * Calculate next sync time based on config settings
	 */
	private calculateNextSync(config: SyncConfig): Date {
		const now = new Date();
		const intervalMinutes = (config.settings?.syncIntervalMinutes as number) || 60;
		now.setMinutes(now.getMinutes() + intervalMinutes);
		return now;
	}

	/**
	 * Sync specific events to all configured bidirectional or push sync providers
	 * Used after create/update/delete operations to immediately push changes
	 */
	async syncSpecificEvents(userId: string, eventIds: string[]): Promise<void> {
		console.log(`[SyncService] Syncing specific events for user ${userId}:`, eventIds);

		try {
			// Get all enabled sync configs for this user that support push
			const configs = await db
				.select()
				.from(syncConfigTable)
				.where(
					and(
						eq(syncConfigTable.userId, userId),
						eq(syncConfigTable.enabled, true)
					)
				);

			const pushConfigs = configs.filter(
				(c) => c.direction === 'push' || c.direction === 'bidirectional'
			);

			if (pushConfigs.length === 0) {
				console.log(`[SyncService] No push-enabled sync configs found for user ${userId}`);
				return;
			}

			console.log(`[SyncService] Found ${pushConfigs.length} push-enabled sync configs`);

			for (const configRow of pushConfigs) {
				const config = this.rowToConfig(configRow);
				console.log(`[SyncService] Processing sync config: ${config.id} (${config.providerType})`);

				try {
					const provider = await this.getProviderInstance(config);

					for (const eventId of eventIds) {
						await this.syncSingleEvent(config, provider, eventId);
					}
				} catch (error: any) {
					console.error(`[SyncService] Failed to sync with config ${config.id}:`, error);
					// Continue with other configs even if one fails
				}
			}

			console.log(`[SyncService] Completed syncing specific events`);
		} catch (error: any) {
			console.error(`[SyncService] Error in syncSpecificEvents:`, error);
			// Don't throw - sync failures shouldn't break CRUD operations
		}
	}

	/**
	 * Sync a single event to a provider (create, update, or delete)
	 */
	private async syncSingleEvent(
		config: SyncConfig,
		provider: SyncProvider,
		eventId: string
	): Promise<void> {
		console.log(`[SyncService] Syncing event ${eventId} with config ${config.id}`);

		try {
			// Check if event exists
			const [eventRow] = await db
				.select()
				.from(eventTable)
				.where(and(eq(eventTable.id, eventId), eq(eventTable.userId, config.userId)));

			// Check for existing mapping
			const [mapping] = await db
				.select()
				.from(syncMappingTable)
				.where(
					and(
						eq(syncMappingTable.eventId, eventId),
						eq(syncMappingTable.syncConfigId, config.id)
					)
				);

			if (!eventRow) {
				// Event was deleted
				if (mapping) {
					console.log(`[SyncService] Deleting event ${eventId} from provider`);
					await provider.deleteEvent(mapping.externalId);
					await db.delete(syncMappingTable).where(eq(syncMappingTable.id, mapping.id));
				}
				return;
			}

			if (mapping) {
				// Update existing event
				console.log(`[SyncService] Updating event ${eventId} on provider (external ID: ${mapping.externalId})`);

				// Check if this event was recently synced from provider (within last 30 seconds)
				// This prevents echo loops where: provider → pull → local update → push back
				if (mapping.lastSyncedAt) {
					const timeSinceSync = Date.now() - mapping.lastSyncedAt.getTime();
					if (timeSinceSync < 30000) {
						console.log(`[SyncService] Skipping push for ${eventId} - recently synced from provider (${timeSinceSync}ms ago)`);
						return;
					}
				}

				const externalEvent = this.mapInternalToExternal(eventRow, config.providerType);
				const { etag } = await provider.updateEvent(mapping.externalId, externalEvent);

				await db
					.update(syncMappingTable)
					.set({ etag: etag ?? null, lastSyncedAt: new Date() })
					.where(eq(syncMappingTable.id, mapping.id));
			} else {
				// Create new event
				console.log(`[SyncService] Creating new event ${eventId} on provider`);
				const externalEvent = this.mapInternalToExternal(eventRow, config.providerType);
				const { externalId, etag } = await provider.pushEvent(externalEvent);

				// Create mapping immediately to prevent duplicates if webhook fires quickly
				await db.insert(syncMappingTable).values({
					id: crypto.randomUUID(),
					syncConfigId: config.id,
					eventId: eventRow.id,
					externalId: externalId,
					providerId: config.providerId,
					etag: etag ?? null,
					lastSyncedAt: new Date()
				});

				console.log(`[SyncService] Created mapping for event ${eventId} → external ${externalId}`);
			}

			console.log(`[SyncService] Successfully synced event ${eventId}`);
		} catch (error: any) {
			console.error(`[SyncService] Failed to sync event ${eventId}:`, error);
			// Log but don't throw - we want to continue with other events
		}
	}

	/**
	 * Delete event mappings for specific events (called after event deletion)
	 */
	async deleteEventMappings(userId: string, eventIds: string[]): Promise<void> {
		console.log(`[SyncService] Deleting event mappings for user ${userId}:`, eventIds);

		try {
			// Get all sync configs for this user
			const configs = await db
				.select()
				.from(syncConfigTable)
				.where(eq(syncConfigTable.userId, userId));

			for (const configRow of configs) {
				const config = this.rowToConfig(configRow);

				// Get mappings for these events
				const mappings = await db
					.select()
					.from(syncMappingTable)
					.where(
						and(
							eq(syncMappingTable.syncConfigId, config.id),
							inArray(syncMappingTable.eventId, eventIds)
						)
					);

				if (mappings.length === 0) continue;

				// Try to delete from provider if it supports push/bidirectional
				if (config.direction === 'push' || config.direction === 'bidirectional') {
					try {
						const provider = await this.getProviderInstance(config);

						for (const mapping of mappings) {
							try {
								console.log(`[SyncService] Deleting event from provider: ${mapping.externalId}`);
								await provider.deleteEvent(mapping.externalId);
							} catch (error: any) {
								console.error(`[SyncService] Failed to delete event ${mapping.externalId} from provider:`, error);
								// Continue with other events
							}
						}
					} catch (error: any) {
						console.error(`[SyncService] Failed to initialize provider for deletion:`, error);
					}
				}

				// Delete the mappings from our database
				await db
					.delete(syncMappingTable)
					.where(
						and(
							eq(syncMappingTable.syncConfigId, config.id),
							inArray(syncMappingTable.eventId, eventIds)
						)
					);
			}

			console.log(`[SyncService] Completed deleting event mappings`);
		} catch (error: any) {
			console.error(`[SyncService] Error in deleteEventMappings:`, error);
			// Don't throw - sync failures shouldn't break delete operations
		}
	}

	/**
	 * Cancel webhook for a sync configuration
	 * Stops receiving push notifications from the provider
	 */
	async cancelWebhook(configId: string): Promise<void> {
		console.log(`[SyncService] Canceling webhook for config: ${configId}`);

		try {
			// Get sync config
			const [configRow] = await db
				.select()
				.from(syncConfigTable)
				.where(eq(syncConfigTable.id, configId));

			if (!configRow || !configRow.webhookId) {
				console.log(`[SyncService] No webhook found for config: ${configId}`);
				return;
			}

			const config = this.rowToConfig(configRow);

			// Get webhook subscription
			const [subscription] = await db
				.select()
				.from(webhookSubscriptionTable)
				.where(eq(webhookSubscriptionTable.id, configRow.webhookId));

			if (!subscription) {
				console.log(`[SyncService] Webhook subscription not found: ${configRow.webhookId}`);
				return;
			}

			// Initialize provider
			const provider = await this.getProviderInstance(config);

			// Cancel webhook with provider
			if (provider.supportsWebhooks && provider.cancelWebhook) {
				console.log(`[SyncService] Stopping webhook channel: ${subscription.channelId}`);
				await provider.cancelWebhook(subscription);
			}

			// Delete subscription from database
			await db
				.delete(webhookSubscriptionTable)
				.where(eq(webhookSubscriptionTable.id, subscription.id));

			// Clear webhook ID from sync config
			await db
				.update(syncConfigTable)
				.set({ webhookId: null })
				.where(eq(syncConfigTable.id, configId));

			console.log(`[SyncService] Webhook canceled successfully`);
		} catch (error: any) {
			console.error(`[SyncService] Failed to cancel webhook:`, error);
			// Don't throw - webhook may have already expired or been deleted
		}
	}
}

// Export singleton instance
export const syncService = new SyncService();
