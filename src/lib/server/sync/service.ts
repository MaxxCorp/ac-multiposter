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
	event as eventTable,
	eventContact as eventContactTable,
	tag as tagTable,
	contactTag as contactTagTable,
	user as userTable,
	contactEmail as contactEmailTable,
	location as locationTable,
	eventLocation as eventLocationTable,
	recurringSeries as recurringSeries
} from '../db/schema';
import { getEntityContacts } from '../contacts';
import { resolveEventContact } from '../contact-resolution';
import { eq, and, isNull, lt, gt, gte, lte, or, inArray, desc } from 'drizzle-orm';
import { GoogleCalendarProvider } from './providers/google-calendar';
import { BerlinDeMainCalendarProvider } from './providers/berlin-de-main-calendar';
import { WpTheEventsCalendarProvider } from './providers/wp-the-events-calendar';
import { EventbriteProvider } from './providers/eventbrite';
import { MeetupProvider } from './providers/meetup';
import { SeniorennetzBerlinProvider } from './providers/seniorennetz-berlin';
import { BewegungsatlasBerlinProvider } from './providers/bewegungsatlas-berlin';
import { EmailProvider } from './providers/email';
import crypto from 'crypto';
import { env } from '$env/dynamic/private';
import { publishEventChange } from '../realtime';

/**
 * Central sync service orchestrator
 * Manages provider instances and coordinates sync operations
 */
export class SyncService {
	private providers = new Map<ProviderType, new () => SyncProvider>();

	constructor() {
		// Register built-in providers
		this.registerProvider('google-calendar', GoogleCalendarProvider);
		this.registerProvider('berlin-de-main-calendar', BerlinDeMainCalendarProvider);
		this.registerProvider('wp-the-events-calendar', WpTheEventsCalendarProvider);
		this.registerProvider('eventbrite', EventbriteProvider);
		this.registerProvider('meetup', MeetupProvider);
		this.registerProvider('seniorennetz-berlin', SeniorennetzBerlinProvider);
		this.registerProvider('bewegungsatlas-berlin', BewegungsatlasBerlinProvider);
		this.registerProvider('email', EmailProvider);
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
		const result: SyncResult = {
			success: true,
			pulled: 0,
			pushed: 0,
			errors: []
		};

		let operationId: string | undefined;

		try {
			// Get sync config
			const [configRow] = await db
				.select()
				.from(syncConfigTable)
				.where(and(eq(syncConfigTable.id, configId), eq(syncConfigTable.enabled, true)));

			if (!configRow) {
				console.error(`[SyncService] Sync config not found or disabled: ${configId}`);
				throw new Error(`Sync config not found or disabled: ${configId}`);
			}

			const config = this.rowToConfig(configRow);

			// Create operation record
			const [operationRow] = await db.insert(syncOperationTable).values({
				syncConfigId: configId,
				operation: 'pull',
				status: 'pending',
				entityType: 'event',
				startedAt: new Date()
			}).returning({ id: syncOperationTable.id });

			operationId = operationRow.id;

			// Initialize provider
			const provider = await this.getProviderInstance(config);

			// Pull events from provider
			if (config.direction === 'pull' || config.direction === 'bidirectional') {
				const pullResult = await this.pullFromProvider(config, provider);
				result.pulled = pullResult.pulled;
				result.errors.push(...pullResult.errors);
			}

			// Push local changes to provider
			if (config.direction === 'push' || config.direction === 'bidirectional') {
				const pushResult = await this.pushToProvider(config, provider);
				result.pushed = pushResult.pushed;
				result.errors.push(...pushResult.errors);
			}

			// Update operation status
			await db
				.update(syncOperationTable)
				.set({
					status: result.errors.length > 0 ? 'failed' : 'completed',
					completedAt: new Date(),
					error: result.errors.length > 0 ? JSON.stringify(result.errors) : null
				})
				.where(eq(syncOperationTable.id, operationId));

			// Update sync config with last sync time
			await db
				.update(syncConfigTable)
				.set({
					lastSyncAt: new Date(),
					nextSyncAt: this.calculateNextSync(config)
				})
				.where(eq(syncConfigTable.id, configId));

			result.success = result.errors.length === 0;
			return result;
		} catch (error: any) {
			console.error(`[SyncService] Sync failed with error:`, error);
			console.error(`[SyncService] Error stack:`, error.stack);
			result.success = false;
			result.errors.push({ message: error.message });

			// Update operation as failed if we created one
			if (operationId) {
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
			// Pull events using sync token if available
			const { events, nextSyncToken } = await provider.pullEvents(config.syncToken);

			for (const externalEvent of events) {
				try {
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
				.where(isNull(syncMappingTable.eventId));

			for (const { event } of unmappedEvents) {
				try {
					const externalEvent = await this.mapInternalToExternal(event, config.providerType);
					const { externalId, etag } = await provider.pushEvent(externalEvent);

					await db.insert(syncMappingTable).values({
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
				.where(eq(syncMappingTable.syncConfigId, config.id));

			for (const { event, mapping } of mappedEvents) {
				try {
					// Skip if not modified since last sync
					if (mapping.lastSyncedAt && event.updatedAt <= mapping.lastSyncedAt) {
						continue;
					}

					const externalEvent = await this.mapInternalToExternal(event, config.providerType);
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
			if (mapping && mapping.eventId) {
				// Delete the local event
				// Note: This might trigger a delete hook if we had one, but we don't.
				// However, we should be careful not to trigger a push-back loop if we add one later.
				await db.delete(eventTable).where(eq(eventTable.id, mapping.eventId));

				// Mapping should be deleted by cascade if foreign key exists, but let's be safe
				await db.delete(syncMappingTable).where(eq(syncMappingTable.id, mapping.id));

			}
			return;
		}


		if (mapping) {
			if (!mapping.eventId) return;
			// Update existing event

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
					// Still update the mapping timestamp to prevent re-processing
					await db
						.update(syncMappingTable)
						.set({ etag: externalEvent.etag ?? null, lastSyncedAt: new Date() })
						.where(eq(syncMappingTable.id, mapping.id));
					return;
				}
			}

			const internalEvent = await this.mapExternalToInternalWithContacts(externalEvent, config.userId);

			await db
				.update(eventTable)
				.set({ ...internalEvent, updatedAt: new Date() })
				.where(eq(eventTable.id, mapping.eventId));

			await db
				.update(syncMappingTable)
				.set({ etag: externalEvent.etag ?? null, lastSyncedAt: new Date() })
				.where(eq(syncMappingTable.id, mapping.id));

			await publishEventChange('update', [mapping.eventId]);

			// Update event contacts status
			if (externalEvent.attendees) {
				for (const attendee of externalEvent.attendees) {
					const [contactRecord] = await db.query.contact.findMany({
						where: (c, { eq, exists }) => exists(
							db.select().from(contactEmailTable)
								.where(and(
									eq(contactEmailTable.contactId, c.id),
									eq(contactEmailTable.value, attendee.email)
								))
						),
						limit: 1
					});

					if (contactRecord) {
						await db.insert(eventContactTable).values({
							eventId: mapping.eventId,
							contactId: contactRecord.id,
							participationStatus: attendee.responseStatus || 'needsAction'
						}).onConflictDoUpdate({
							target: [eventContactTable.eventId, eventContactTable.contactId],
							set: { participationStatus: attendee.responseStatus || 'needsAction' }
						});
					}
				}
			}

		} else {
			// Check if this is an "echo" of an event we created/pushed
			const appEventId = externalEvent.metadata?.app_event_id;

			if (appEventId) {
				const [existingEvent] = await db
					.select()
					.from(eventTable)
					.where(eq(eventTable.id, appEventId));

				if (existingEvent) {
					console.log(`[SyncService] Identified echo for event ${appEventId} via metadata. Healing mapping.`);

					await db.insert(syncMappingTable).values({
						syncConfigId: config.id,
						eventId: existingEvent.id,
						externalId: externalEvent.externalId,
						providerId: config.providerId,
						etag: externalEvent.etag ?? null,
						lastSyncedAt: new Date()
					});

					return;
				} else {
					// We created it, but we can't find it locally. 
					// Limit: 5. It must have been deleted locally.
					// Ignorance is bliss - prevent resurrection.
					console.log(`[SyncService] Detected echo for deleted event ${appEventId}. Ignoring to prevent resurrection.`);
					return;
				}
			}

			// Before creating a new event, check if we already have a local event with similar properties
			// that was just created (within last 30 seconds). This prevents duplicates when:
			// 1. User creates event locally → pushes to Google → webhook fires → tries to pull back
			const timeWindow = 2 * 60 * 1000; // 2 minutes
			let startTimeCheck = undefined;

			if (externalEvent.startDateTime) {
				const t = externalEvent.startDateTime.getTime();
				startTimeCheck = and(
					gte(eventTable.startDateTime, new Date(t - timeWindow)),
					lte(eventTable.startDateTime, new Date(t + timeWindow))
				);
			} else if (externalEvent.startDate) {
				// For all-day events, check startDate string
				startTimeCheck = eq(eventTable.startDate, externalEvent.startDate);
			}

			const recentEvents = await db
				.select()
				.from(eventTable)
				.where(
					// Use OR to find events that match EITHER by strict summary OR by time window
					// This handles cases where summary formatting differs (e.g. smart quotes) but it's the same event
					or(
						eq(eventTable.summary, externalEvent.summary),
						startTimeCheck
					)
				);

			// Check if any recent event matches this external event
			console.log(`[SyncService] No match found for external ${externalEvent.externalId}. Checking ${recentEvents.length} recent events for fuzzy match:`, {
				externalTitle: externalEvent.summary,
				externalStart: externalEvent.startDateTime || externalEvent.startDate
			});

			for (const recentEvent of recentEvents) {
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

				if (startTimesMatch) {
					console.log(`[SyncService] Fuzzy match found! healing mapping for event ${recentEvent.id}`);
					// Create mapping to link this local event to the external one
					await db.insert(syncMappingTable).values({
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
		const internalEvent = await this.mapExternalToInternalWithContacts(externalEvent, config.userId);
		const [newEvent] = await db.insert(eventTable).values(internalEvent).returning({ id: eventTable.id });

		await db.insert(syncMappingTable).values({
			syncConfigId: config.id,
			eventId: newEvent.id,
			externalId: externalEvent.externalId,
			providerId: config.providerId,
			etag: externalEvent.etag ?? null,
			lastSyncedAt: new Date()
		});

		await publishEventChange('create', [newEvent.id]);

		// Update event contacts associations and their status
		if (externalEvent.attendees) {
			for (const attendee of externalEvent.attendees) {
				// Find or create person contact for this attendee
				const [contactRecord] = await db.query.contact.findMany({
					where: (c, { eq, exists }) => exists(
						db.select().from(contactEmailTable)
							.where(and(
								eq(contactEmailTable.contactId, c.id),
								eq(contactEmailTable.value, attendee.email)
							))
					),
					limit: 1
				});

				if (contactRecord) {
					await db.insert(eventContactTable).values({
						eventId: newEvent.id,
						contactId: contactRecord.id,
						participationStatus: attendee.responseStatus || 'needsAction'
					}).onConflictDoUpdate({
						target: [eventContactTable.eventId, eventContactTable.contactId],
						set: { participationStatus: attendee.responseStatus || 'needsAction' }
					});
				}
			}
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
		const [configRow] = await db.select().from(syncConfigTable).where(eq(syncConfigTable.id, configId));

		if (!configRow) {
			throw new Error(`Sync config not found: ${configId}`);
		}

		const config = this.rowToConfig(configRow);
		const provider = await this.getProviderInstance(config);

		if (!provider.supportsWebhooks) {
			return;
		}

		// Cancel existing webhooks
		// Cancel existing webhooks
		await this.removeWebhook(configId);

		// Construct callback URL
		const baseUrl = env.BETTER_AUTH_URL || 'https://localhost:5173';
		const callbackUrl = `${baseUrl}/api/sync/webhook/${config.providerType}`;

		// Setup new webhook
		if (provider.setupWebhook) {
			const subscription = await provider.setupWebhook(callbackUrl);

			if (subscription) {
				await db.insert(webhookSubscriptionTable).values(subscription);
				await db
					.update(syncConfigTable)
					.set({ webhookId: subscription.id })
					.where(eq(syncConfigTable.id, configId));
			}
		}
	}


	/**
	 * Remove webhook for a sync config
	 */
	async removeWebhook(configId: string): Promise<void> {
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
		const expiringDate = new Date();
		expiringDate.setHours(expiringDate.getHours() + 24);

		const expiring = await db
			.select()
			.from(webhookSubscriptionTable)
			.where(lt(webhookSubscriptionTable.expiresAt, expiringDate));

		for (const subscription of expiring) {
			try {

				const [configRow] = await db
					.select()
					.from(syncConfigTable)
					.where(eq(syncConfigTable.id, subscription.syncConfigId));

				if (!configRow || !configRow.enabled) {
					await db
						.delete(webhookSubscriptionTable)
						.where(eq(webhookSubscriptionTable.id, subscription.id));
					continue;
				}

				const config = this.rowToConfig(configRow);
				const provider = await this.getProviderInstance(config);

				if (!provider.supportsWebhooks || !provider.renewWebhook) {
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
				}
			} catch (error: any) {
				console.error(`[SyncService] Failed to renew webhook for subscription ${subscription.id}:`, error);
			}
		}
	}

	/**
	 * Map external event to internal event format with owner resolution
	 */
	private async mapExternalToInternalWithContacts(
		external: ExternalEvent,
		defaultUserId: string
	): Promise<typeof eventTable.$inferInsert> {
		let resolvedUserId = defaultUserId;

		// Attempt to resolve owner via contact email
		const resolvedContact = await resolveEventContact(external);
		if (resolvedContact?.email) {
			const [userRow] = await db
				.select()
				.from(userTable)
				.where(eq(userTable.email, resolvedContact.email))
				.limit(1);

			if (userRow) {
				resolvedUserId = userRow.id;
			}
		}

		return {
			userId: resolvedUserId,
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
	private async mapInternalToExternal(
		internal: typeof eventTable.$inferSelect,
		providerId: ProviderType
	): Promise<ExternalEvent> {
		// Fetch recurrence from series table if seriesId is present
		let recurrenceRules: string[] | undefined = undefined;
		if ((internal as any).seriesId) {
			const [series] = await db
				.select()
				.from(recurringSeries)
				.where(eq(recurringSeries.id, (internal as any).seriesId));
			if (series?.rrule) {
				recurrenceRules = [series.rrule];
			}
		}
		// Fallback to legacy recurrence field if no series
		if (!recurrenceRules && internal.recurrence) {
			recurrenceRules = internal.recurrence as string[];
		}

		// Fetch associated contacts
		const associatedContacts = await getEntityContacts('event', internal.id);

		// Filter out contacts with "Employee" tag
		const attendees = [];
		for (const contact of associatedContacts) {
			const contactTags = (contact as any).tags || [];
			const isEmployee = contactTags.some((ct: any) => ct.tag.name.toLowerCase() === 'employee');

			if (!isEmployee) {
				// Get primary email
				const email = (contact as any).emails?.find((e: any) => e.primary)?.value ||
					(contact as any).emails?.[0]?.value;

				if (email) {
					// Find the association to get participation status
					const [assoc] = await db
						.select()
						.from(eventContactTable)
						.where(and(
							eq(eventContactTable.eventId, internal.id),
							eq(eventContactTable.contactId, contact.id)
						))
						.limit(1);

					attendees.push({
						email,
						displayName: contact.displayName || `${contact.givenName || ''} ${contact.familyName || ''}`.trim(),
						responseStatus: assoc?.participationStatus || 'needsAction'
					});
				}
			}
		}

		// Resolve Venue (Location)
		let venue: ExternalEvent['venue'] | undefined;
		if (internal.location) {
			// Try to find structured location data
			const [locationMapping] = await db
				.select({ location: locationTable })
				.from(eventLocationTable)
				.innerJoin(locationTable, eq(eventLocationTable.locationId, locationTable.id))
				.where(eq(eventLocationTable.eventId, internal.id))
				.limit(1);

			if (locationMapping) {
				venue = {
					name: locationMapping.location.name,
					address: locationMapping.location.street ? `${locationMapping.location.street} ${locationMapping.location.houseNumber || ''}`.trim() : undefined,
					city: locationMapping.location.city ?? undefined,
					country: locationMapping.location.country ?? undefined,
					zip: locationMapping.location.zip ?? undefined,
					// Province/State not strictly typed in location schema but often part of address
					province: locationMapping.location.state ?? undefined,
				};
			} else {
				// Fallback to text location if no structured location is linked
				venue = {
					name: internal.location
				};
			}
		}

		// Resolve Organizer (Contact with "Employee" tag)
		let organizer: ExternalEvent['organizer'] | undefined;

		// Find associated contacts who are employees
		for (const contact of associatedContacts) {
			const contactTags = (contact as any).tags || [];
			const isEmployee = contactTags.some((ct: any) => ct.tag.name.toLowerCase() === 'employee' || ct.tag.name.toLowerCase() === 'employees');

			if (isEmployee) {
				// Use the first employee found as organizer
				const email = (contact as any).emails?.find((e: any) => e.primary)?.value ||
					(contact as any).emails?.[0]?.value;
				const phone = (contact as any).phones?.find((p: any) => p.primary)?.value ||
					(contact as any).phones?.[0]?.value;

				organizer = {
					name: contact.displayName || `${contact.givenName || ''} ${contact.familyName || ''}`.trim(),
					email: email,
					phone: phone
				};
				break; // Only one organizer
			}
		}

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
			attendees: attendees.length > 0 ? attendees : undefined,
			recurrence: recurrenceRules,
			reminders: (internal.reminders as any) ?? undefined,
			source: (internal.source as any) ?? undefined,
			ticketPrice: internal.ticketPrice ?? undefined,
			venue,
			organizer,
			metadata: {
				eventId: internal.id,
				seriesId: (internal as any).seriesId ?? undefined,
				app_event_id: internal.id // Pass internal ID to provider for loop prevention
			}
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

				return;
			}



			for (const configRow of pushConfigs) {
				const config = this.rowToConfig(configRow);


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


				// Check if this event was recently synced from provider (within last 30 seconds)
				// This prevents echo loops where: provider → pull → local update → push back
				// REMOVED: This check blocks legitimate user updates immediately after a sync/creation.
				// Since SyncService updates DB directly without triggering 'triggerPushSync', 
				// the echo loop risk is minimal for user-initiated actions.

				const externalEvent = await this.mapInternalToExternal(eventRow, config.providerType);
				const { etag } = await provider.updateEvent(mapping.externalId, externalEvent);

				await db
					.update(syncMappingTable)
					.set({ etag: etag ?? null, lastSyncedAt: new Date() })
					.where(eq(syncMappingTable.id, mapping.id));
			} else {
				// Create new event

				const externalEvent = await this.mapInternalToExternal(eventRow, config.providerType);
				const { externalId, etag } = await provider.pushEvent(externalEvent);

				// Create mapping immediately to prevent duplicates if webhook fires quickly
				await db.insert(syncMappingTable).values({
					syncConfigId: config.id,
					eventId: eventRow.id,
					externalId: externalId,
					providerId: config.providerId,
					etag: etag ?? null,
					lastSyncedAt: new Date()
				});

				console.log(`[SyncService] Created mapping for event ${eventId} → external ${externalId}`);
			}


		} catch (error: any) {
			console.error(`[SyncService] Failed to sync event ${eventId}:`, error);
			// Log but don't throw - we want to continue with other events
		}
	}

	/**
	 * Delete event mappings for specific events (called after event deletion)
	 */
	async deleteEventMappings(userId: string, eventIds: string[]): Promise<void> {


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
		try {
			// Get sync config
			const [configRow] = await db
				.select()
				.from(syncConfigTable)
				.where(eq(syncConfigTable.id, configId));

			if (!configRow || !configRow.webhookId) {
				return;
			}

			const config = this.rowToConfig(configRow);

			// Get webhook subscription
			const [subscription] = await db
				.select()
				.from(webhookSubscriptionTable)
				.where(eq(webhookSubscriptionTable.id, configRow.webhookId));

			if (!subscription) {
				return;
			}

			// Initialize provider
			const provider = await this.getProviderInstance(config);

			// Cancel webhook with provider
			if (provider.supportsWebhooks && provider.cancelWebhook) {
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
		} catch (error: any) {
			console.error(`[SyncService] Failed to cancel webhook:`, error);
			// Don't throw - webhook may have already expired or been deleted
		}
	}

	/**
	 * Trigger push sync for a user
	 * Should be called when a user creates/updates an event locally
	 */
	async triggerPushSync(userId: string, eventId?: string): Promise<void> {
		try {
			if (eventId) {
				// optimized path: sync only the specific event
				await this.syncSpecificEvents(userId, [eventId]);
				return;
			}

			// Find all enabled sync configs for this user with push direction
			const configs = await db
				.select()
				.from(syncConfigTable)
				.where(
					and(
						eq(syncConfigTable.userId, userId),
						eq(syncConfigTable.enabled, true)
					)
				);

			for (const configRow of configs) {
				const config = this.rowToConfig(configRow);
				if (config.direction === 'push' || config.direction === 'bidirectional') {
					// Trigger async sync (background)
					this.syncEvents(config.id).catch((error) => {
						console.error(`[SyncService] Triggered push sync failed for config ${config.id}:`, error);
					});
				}
			}
		} catch (error) {
			console.error(`[SyncService] Failed to trigger push sync for user ${userId}:`, error);
		}
	}
}

// Export singleton instance
export const syncService = new SyncService();
