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
 * Meetup sync provider implementation
 * Push-only provider for creating events on Meetup
 */
export class MeetupProvider implements SyncProvider {
	readonly type: ProviderType = 'meetup';
	readonly name = 'Meetup';
	readonly supportsWebhooks = false; // Meetup doesn't support webhooks for push-only sync
	readonly supportedDirections: SyncDirection[] = ['push'];
	readonly supportedEntityTypes: ('event' | 'announcement')[] = ['event'];


	private config?: SyncConfig;
	private accessToken?: string;

	async initialize(config: SyncConfig): Promise<void> {
		this.config = config;

		// Check environment variables
		const clientId = env.MEETUP_CLIENT_ID;
		const clientSecret = env.MEETUP_CLIENT_SECRET;

		if (!clientId || !clientSecret) {
			console.error(`[MeetupProvider] Missing OAuth credentials:`, {
				hasClientId: !!clientId,
				hasClientSecret: !!clientSecret
			});
			throw new Error('Missing Meetup OAuth credentials (MEETUP_CLIENT_ID or MEETUP_CLIENT_SECRET)');
		}

		// Fetch fresh credentials from the Better Auth account table
		const [userAccount] = await db
			.select()
			.from(account)
			.where(and(
				eq(account.userId, config.userId),
				eq(account.providerId, 'meetup')
			))
			.limit(1);

		if (!userAccount) {
			throw new Error('No Meetup account connected. Please connect your Meetup account.');
		}

		this.accessToken = userAccount.accessToken || undefined;

		if (!this.accessToken) {
			console.error(`[MeetupProvider] Missing access token`);
			throw new Error('Missing access token for Meetup');
		}
	}

	async validateConnection(): Promise<boolean> {
		if (!this.accessToken) {
			return false;
		}

		try {
			// Test connection by getting user info
			const response = await fetch('https://api.meetup.com/gql-ext', {
				method: 'POST',
				headers: {
					'Authorization': `Bearer ${this.accessToken}`,
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					query: 'query { self { id name } }'
				})
			});

			const result = await response.json();
			return !result.errors && !!result.data?.self;
		} catch (error) {
			console.error('[MeetupProvider] Connection validation failed:', error);
			return false;
		}
	}

	async pullEvents(syncToken?: string): Promise<{
		events: ExternalEvent[];
		nextSyncToken?: string;
	}> {
		// Meetup provider is push-only, so we don't implement pull
		throw new Error('Meetup provider does not support pulling events');
	}

	async pushEvent(event: ExternalEvent): Promise<{ externalId: string; etag?: string }> {
		if (!this.accessToken) {
			throw new Error('Provider not initialized');
		}

		const meetupEvent = this.mapToMeetupEvent(event);

		const response = await fetch('https://api.meetup.com/gql-ext', {
			method: 'POST',
			headers: {
				'Authorization': `Bearer ${this.accessToken}`,
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				query: `
					mutation($input: CreateEventInput!) {
						createEvent(input: $input) {
							event {
								id
							}
							errors {
								message
								code
								field
							}
						}
					}
				`,
				variables: {
					input: meetupEvent
				}
			})
		});

		if (!response.ok) {
			const errorData = await response.json().catch(() => ({}));
			console.error('[MeetupProvider] Failed to create event:', {
				status: response.status,
				statusText: response.statusText,
				error: errorData
			});
			throw new Error(`Failed to create event on Meetup: ${response.status} ${response.statusText}`);
		}

		const result = await response.json();

		if (result.errors && result.errors.length > 0) {
			console.error('[MeetupProvider] GraphQL errors:', result.errors);
			throw new Error(`Meetup API error: ${result.errors[0].message}`);
		}

		if (!result.data?.createEvent?.event?.id) {
			throw new Error('Failed to create event: No event ID returned');
		}

		return {
			externalId: result.data.createEvent.event.id,
			etag: new Date().toISOString() // Meetup doesn't provide etags, use current timestamp
		};
	}

	async updateEvent(externalId: string, event: ExternalEvent): Promise<{ etag?: string }> {
		if (!this.accessToken) {
			throw new Error('Provider not initialized');
		}

		const meetupEvent = this.mapToMeetupEvent(event);
		// Add eventId for update
		meetupEvent.eventId = externalId;

		const response = await fetch('https://api.meetup.com/gql-ext', {
			method: 'POST',
			headers: {
				'Authorization': `Bearer ${this.accessToken}`,
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				query: `
					mutation($input: EditEventInput!) {
						editEvent(input: $input) {
							event {
								id
							}
							errors {
								message
								code
								field
							}
						}
					}
				`,
				variables: {
					input: meetupEvent
				}
			})
		});

		if (!response.ok) {
			const errorData = await response.json().catch(() => ({}));
			console.error('[MeetupProvider] Failed to update event:', {
				externalId,
				status: response.status,
				statusText: response.statusText,
				error: errorData
			});
			throw new Error(`Failed to update event on Meetup: ${response.status} ${response.statusText}`);
		}

		const result = await response.json();

		if (result.errors && result.errors.length > 0) {
			console.error('[MeetupProvider] GraphQL errors:', result.errors);
			throw new Error(`Meetup API error: ${result.errors[0].message}`);
		}

		return {
			etag: new Date().toISOString()
		};
	}

	async deleteEvent(externalId: string): Promise<void> {
		if (!this.accessToken) {
			throw new Error('Provider not initialized');
		}

		// Meetup doesn't have a delete mutation, so we cancel the event instead
		const response = await fetch('https://api.meetup.com/gql-ext', {
			method: 'POST',
			headers: {
				'Authorization': `Bearer ${this.accessToken}`,
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				query: `
					mutation($input: EditEventInput!) {
						editEvent(input: $input) {
							event {
								id
							}
							errors {
								message
								code
								field
							}
						}
					}
				`,
				variables: {
					input: {
						eventId: externalId,
						publishStatus: 'CANCELLED'
					}
				}
			})
		});

		if (!response.ok) {
			const errorData = await response.json().catch(() => ({}));
			console.error('[MeetupProvider] Failed to cancel event:', {
				externalId,
				status: response.status,
				statusText: response.statusText,
				error: errorData
			});
			throw new Error(`Failed to cancel event on Meetup: ${response.status} ${response.statusText}`);
		}

		const result = await response.json();

		if (result.errors && result.errors.length > 0) {
			console.error('[MeetupProvider] GraphQL errors:', result.errors);
			throw new Error(`Meetup API error: ${result.errors[0].message}`);
		}
	}

	// Webhook methods not implemented for push-only provider
	setupWebhook?(): Promise<any> {
		throw new Error('Meetup provider does not support webhooks');
	}

	renewWebhook?(): Promise<any> {
		throw new Error('Meetup provider does not support webhooks');
	}

	cancelWebhook?(): Promise<any> {
		throw new Error('Meetup provider does not support webhooks');
	}

	processWebhook?(): Promise<any> {
		throw new Error('Meetup provider does not support webhooks');
	}

	private mapToMeetupEvent(event: ExternalEvent): any {
		const meetupEvent: any = {
			groupUrlname: this.config?.settings?.groupUrlname || '',
			title: event.summary,
			description: event.description || event.summary,
			startDateTime: event.startDateTime?.toISOString() || `${event.startDate}T00:00:00Z`,
			publishStatus: 'PUBLISHED' // Create events as published by default
		};

		// Handle duration
		if (event.endDateTime && event.startDateTime) {
			const durationMs = event.endDateTime.getTime() - event.startDateTime.getTime();
			const durationMinutes = Math.floor(durationMs / (1000 * 60));
			meetupEvent.duration = `PT${durationMinutes}M`;
		} else if (event.endDate && event.startDate) {
			// All-day event - set duration to 24 hours
			meetupEvent.duration = 'PT1440M';
		} else {
			meetupEvent.duration = 'PT60M'; // Default 1 hour
		}

		// Add venue if location is provided and venueId is configured
		if (event.location && this.config?.settings?.venueId) {
			meetupEvent.venueId = this.config.settings.venueId;
		}

		// Set event type based on location
		if (!event.location || event.location.toLowerCase().includes('online')) {
			meetupEvent.eventType = 'online';
		} else {
			meetupEvent.eventType = 'inPerson';
		}

		// Add timezone
		if (event.startTimeZone) {
			meetupEvent.timezone = event.startTimeZone;
		}

		return meetupEvent;
	}
}