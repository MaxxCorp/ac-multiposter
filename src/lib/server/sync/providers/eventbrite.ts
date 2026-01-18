import type {
	SyncProvider,
	SyncConfig,
	ExternalEvent,
	ProviderType,
	SyncDirection
} from '../types';
import { env } from '$env/dynamic/private';
import { db } from '$lib/server/db';
import { account } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';

/**
 * Eventbrite sync provider implementation
 * Push-only provider for creating events on Eventbrite
 */
export class EventbriteProvider implements SyncProvider {
	readonly type: ProviderType = 'eventbrite';
	readonly name = 'Eventbrite';
	readonly supportsWebhooks = false; // Eventbrite doesn't support webhooks for push-only sync
	readonly supportedDirections: SyncDirection[] = ['push'];
	readonly supportedEntityTypes: ('event' | 'announcement')[] = ['event'];


	private config?: SyncConfig;
	private accessToken?: string;

	async initialize(config: SyncConfig): Promise<void> {
		this.config = config;

		// Check environment variables
		const clientId = env.EVENTBRITE_CLIENT_ID;
		const clientSecret = env.EVENTBRITE_CLIENT_SECRET;

		if (!clientId || !clientSecret) {
			console.error(`[EventbriteProvider] Missing OAuth credentials:`, {
				hasClientId: !!clientId,
				hasClientSecret: !!clientSecret
			});
			throw new Error('Missing Eventbrite OAuth credentials (EVENTBRITE_CLIENT_ID or EVENTBRITE_CLIENT_SECRET)');
		}

		// Fetch fresh credentials from the Better Auth account table
		const [userAccount] = await db
			.select()
			.from(account)
			.where(and(
				eq(account.userId, config.userId),
				eq(account.providerId, 'eventbrite')
			))
			.limit(1);

		if (!userAccount) {
			throw new Error('No Eventbrite account connected. Please connect your Eventbrite account.');
		}

		this.accessToken = userAccount.accessToken || undefined;

		if (!this.accessToken) {
			console.error(`[EventbriteProvider] Missing access token`);
			throw new Error('Missing access token for Eventbrite');
		}
	}

	async validateConnection(): Promise<boolean> {
		if (!this.accessToken) {
			return false;
		}

		try {
			// Test connection by getting user info
			const response = await fetch('https://www.eventbriteapi.com/v3/users/me/', {
				headers: {
					'Authorization': `Bearer ${this.accessToken}`,
					'Content-Type': 'application/json'
				}
			});

			return response.ok;
		} catch (error) {
			console.error('[EventbriteProvider] Connection validation failed:', error);
			return false;
		}
	}

	async pullEvents(syncToken?: string): Promise<{
		events: ExternalEvent[];
		nextSyncToken?: string;
	}> {
		// Eventbrite provider is push-only, so we don't implement pull
		throw new Error('Eventbrite provider does not support pulling events');
	}

	async pushEvent(event: ExternalEvent): Promise<{ externalId: string; etag?: string }> {
		if (!this.accessToken) {
			throw new Error('Provider not initialized');
		}

		const eventbriteEvent = this.mapToEventbriteEvent(event);

		const response = await fetch('https://www.eventbriteapi.com/v3/events/', {
			method: 'POST',
			headers: {
				'Authorization': `Bearer ${this.accessToken}`,
				'Content-Type': 'application/json'
			},
			body: JSON.stringify(eventbriteEvent)
		});

		if (!response.ok) {
			const errorData = await response.json().catch(() => ({}));
			console.error('[EventbriteProvider] Failed to create event:', {
				status: response.status,
				statusText: response.statusText,
				error: errorData
			});
			throw new Error(`Failed to create event on Eventbrite: ${response.status} ${response.statusText}`);
		}

		const createdEvent = await response.json();

		return {
			externalId: createdEvent.id,
			etag: createdEvent.changed // Eventbrite uses 'changed' field as etag
		};
	}

	async updateEvent(externalId: string, event: ExternalEvent): Promise<{ etag?: string }> {
		if (!this.accessToken) {
			throw new Error('Provider not initialized');
		}

		const eventbriteEvent = this.mapToEventbriteEvent(event);

		const response = await fetch(`https://www.eventbriteapi.com/v3/events/${externalId}/`, {
			method: 'POST', // Eventbrite uses POST for updates
			headers: {
				'Authorization': `Bearer ${this.accessToken}`,
				'Content-Type': 'application/json'
			},
			body: JSON.stringify(eventbriteEvent)
		});

		if (!response.ok) {
			const errorData = await response.json().catch(() => ({}));
			console.error('[EventbriteProvider] Failed to update event:', {
				externalId,
				status: response.status,
				statusText: response.statusText,
				error: errorData
			});
			throw new Error(`Failed to update event on Eventbrite: ${response.status} ${response.statusText}`);
		}

		const updatedEvent = await response.json();

		return {
			etag: updatedEvent.changed
		};
	}

	async deleteEvent(externalId: string): Promise<void> {
		if (!this.accessToken) {
			throw new Error('Provider not initialized');
		}

		const response = await fetch(`https://www.eventbriteapi.com/v3/events/${externalId}/`, {
			method: 'DELETE',
			headers: {
				'Authorization': `Bearer ${this.accessToken}`,
				'Content-Type': 'application/json'
			}
		});

		if (!response.ok) {
			const errorData = await response.json().catch(() => ({}));
			console.error('[EventbriteProvider] Failed to delete event:', {
				externalId,
				status: response.status,
				statusText: response.statusText,
				error: errorData
			});
			throw new Error(`Failed to delete event on Eventbrite: ${response.status} ${response.statusText}`);
		}
	}

	// Webhook methods not implemented for push-only provider
	setupWebhook?(): Promise<any> {
		throw new Error('Eventbrite provider does not support webhooks');
	}

	renewWebhook?(): Promise<any> {
		throw new Error('Eventbrite provider does not support webhooks');
	}

	cancelWebhook?(): Promise<any> {
		throw new Error('Eventbrite provider does not support webhooks');
	}

	processWebhook?(): Promise<any> {
		throw new Error('Eventbrite provider does not support webhooks');
	}

	private mapToEventbriteEvent(event: ExternalEvent): any {
		const eventbriteEvent: any = {
			name: {
				html: event.summary
			},
			description: {
				html: event.description || event.summary
			},
			start: {
				timezone: event.startTimeZone || 'UTC',
				utc: event.startDateTime?.toISOString()
			},
			end: {
				timezone: event.endTimeZone || event.startTimeZone || 'UTC',
				utc: event.endDateTime?.toISOString()
			}
		};

		// Handle all-day events
		if (event.startDate && !event.startDateTime) {
			eventbriteEvent.start.utc = `${event.startDate}T00:00:00Z`;
			eventbriteEvent.start.timezone = 'UTC';
		}

		if (event.endDate && !event.endDateTime) {
			eventbriteEvent.end.utc = `${event.endDate}T23:59:59Z`;
			eventbriteEvent.end.timezone = 'UTC';
		}

		// Add location if provided
		if (event.location) {
			eventbriteEvent.venue = {
				name: event.location,
				address: {
					city: event.location // Basic location mapping
				}
			};
		}

		// Add organizer ID from config if available
		if (this.config?.settings?.organizerId) {
			eventbriteEvent.organizer_id = this.config.settings.organizerId;
		}

		// Set event status
		if (event.status) {
			switch (event.status) {
				case 'confirmed':
					eventbriteEvent.status = 'live';
					break;
				case 'cancelled':
					eventbriteEvent.status = 'cancelled';
					break;
				case 'tentative':
					eventbriteEvent.status = 'draft';
					break;
				default:
					eventbriteEvent.status = 'draft';
			}
		} else {
			eventbriteEvent.status = 'draft'; // Default to draft
		}

		// Add category if available in metadata
		if (event.metadata?.categoryId) {
			eventbriteEvent.category_id = event.metadata.categoryId;
		}

		// Add format if available in metadata
		if (event.metadata?.formatId) {
			eventbriteEvent.format_id = event.metadata.formatId;
		}

		return eventbriteEvent;
	}
}