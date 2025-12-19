import type {
	SyncProvider,
	SyncConfig,
	ExternalEvent,
	ProviderType,
	SyncDirection
} from '../types';

/**
 * WordPress The Events Calendar sync provider implementation
 * Pushes events to a WordPress site with The Events Calendar plugin
 */
export class WpTheEventsCalendarProvider implements SyncProvider {
	readonly type: ProviderType = 'wp-the-events-calendar';
	readonly name = 'WP The Events Calendar';
	readonly supportsWebhooks = false;
	readonly supportedDirections: SyncDirection[] = ['push'];

	private config?: SyncConfig;
	private baseUrl = '';
	private username = '';
	private applicationPassword = '';

	async initialize(config: SyncConfig): Promise<void> {
		this.config = config;

		// Get WordPress credentials from environment variables
		this.baseUrl = process.env.WP_EVENTS_CALENDAR_BASE_URL || '';
		this.username = process.env.WP_EVENTS_CALENDAR_USERNAME || '';
		this.applicationPassword = process.env.WP_EVENTS_CALENDAR_APP_PASSWORD || '';

		if (!this.baseUrl) {
			throw new Error('WP_EVENTS_CALENDAR_BASE_URL environment variable is required');
		}
		if (!this.username) {
			throw new Error('WP_EVENTS_CALENDAR_USERNAME environment variable is required');
		}
		if (!this.applicationPassword) {
			throw new Error('WP_EVENTS_CALENDAR_APP_PASSWORD environment variable is required');
		}

		// Ensure base URL doesn't end with slash
		this.baseUrl = this.baseUrl.replace(/\/$/, '');

		// Override settings if specified in config
		if (config.settings?.baseUrl) {
			this.baseUrl = config.settings.baseUrl.replace(/\/$/, '');
		}
		if (config.settings?.username) {
			this.username = config.settings.username;
		}
		if (config.settings?.applicationPassword) {
			this.applicationPassword = config.settings.applicationPassword;
		}
	}

	async validateConnection(): Promise<boolean> {
		try {
			// Test connection by fetching events endpoint
			const response = await fetch(`${this.baseUrl}/wp-json/tribe/events/v1/events?per_page=1`, {
				method: 'GET',
				headers: {
					'Authorization': `Basic ${Buffer.from(`${this.username}:${this.applicationPassword}`).toString('base64')}`,
					'Content-Type': 'application/json',
				},
			});

			return response.ok;
		} catch (error) {
			console.error('Failed to validate WordPress Events Calendar connection:', error);
			return false;
		}
	}

	async pullEvents(): Promise<{
		events: ExternalEvent[];
		nextSyncToken?: string;
	}> {
		// Push-only provider doesn't support pulling
		throw new Error('WordPress Events Calendar provider only supports push operations');
	}

	async pushEvent(event: ExternalEvent): Promise<{ externalId: string; etag?: string }> {
		if (!this.config) {
			throw new Error('Provider not initialized');
		}

		// Map our event to WordPress Events Calendar format
		const wpEventData = this.mapEventToWpFormat(event);

		try {
			const response = await fetch(`${this.baseUrl}/wp-json/tribe/events/v1/events`, {
				method: 'POST',
				headers: {
					'Authorization': `Basic ${Buffer.from(`${this.username}:${this.applicationPassword}`).toString('base64')}`,
					'Content-Type': 'application/json',
				},
				body: JSON.stringify(wpEventData),
			});

			if (!response.ok) {
				const errorText = await response.text();
				throw new Error(`WordPress API error: ${response.status} ${response.statusText} - ${errorText}`);
			}

			const createdEvent = await response.json();

			return {
				externalId: createdEvent.id.toString(),
				etag: createdEvent.modified_gmt,
			};
		} catch (error) {
			console.error('Failed to push event to WordPress Events Calendar:', error);
			throw error;
		}
	}

	async updateEvent(externalId: string, event: ExternalEvent): Promise<{ etag?: string }> {
		if (!this.config) {
			throw new Error('Provider not initialized');
		}

		// Map our event to WordPress Events Calendar format
		const wpEventData = this.mapEventToWpFormat(event);

		try {
			const response = await fetch(`${this.baseUrl}/wp-json/tribe/events/v1/events/${externalId}`, {
				method: 'PUT',
				headers: {
					'Authorization': `Basic ${Buffer.from(`${this.username}:${this.applicationPassword}`).toString('base64')}`,
					'Content-Type': 'application/json',
				},
				body: JSON.stringify(wpEventData),
			});

			if (!response.ok) {
				const errorText = await response.text();
				throw new Error(`WordPress API error: ${response.status} ${response.statusText} - ${errorText}`);
			}

			const updatedEvent = await response.json();

			return {
				etag: updatedEvent.modified_gmt,
			};
		} catch (error) {
			console.error('Failed to update event in WordPress Events Calendar:', error);
			throw error;
		}
	}

	async deleteEvent(externalId: string): Promise<void> {
		if (!this.config) {
			throw new Error('Provider not initialized');
		}

		try {
			const response = await fetch(`${this.baseUrl}/wp-json/tribe/events/v1/events/${externalId}`, {
				method: 'DELETE',
				headers: {
					'Authorization': `Basic ${Buffer.from(`${this.username}:${this.applicationPassword}`).toString('base64')}`,
					'Content-Type': 'application/json',
				},
			});

			if (!response.ok) {
				const errorText = await response.text();
				throw new Error(`WordPress API error: ${response.status} ${response.statusText} - ${errorText}`);
			}
		} catch (error) {
			console.error('Failed to delete event from WordPress Events Calendar:', error);
			throw error;
		}
	}

	private mapEventToWpFormat(event: ExternalEvent): any {
		// Map our internal event format to WordPress Events Calendar REST API format
		const wpEvent: any = {
			title: event.summary,
			content: event.description || '',
			status: 'publish', // Publish immediately
		};

		// Handle start date/time
		if (event.startDateTime) {
			wpEvent.start_date = event.startDateTime.toISOString().split('T')[0]; // YYYY-MM-DD
			wpEvent.start_time = event.startDateTime.toTimeString().substring(0, 5); // HH:MM
		} else if (event.startDate) {
			wpEvent.start_date = event.startDate;
			wpEvent.all_day = true;
		}

		// Handle end date/time
		if (event.endDateTime) {
			wpEvent.end_date = event.endDateTime.toISOString().split('T')[0]; // YYYY-MM-DD
			wpEvent.end_time = event.endDateTime.toTimeString().substring(0, 5); // HH:MM
		} else if (event.endDate) {
			wpEvent.end_date = event.endDate;
		}

		// Handle location
		if (event.location) {
			wpEvent.venue = {
				venue: event.location,
			};
		}

		// Handle timezone
		if (event.startTimeZone) {
			wpEvent.timezone = event.startTimeZone;
		}

		// Handle recurrence if present
		if (event.recurrence && event.recurrence.length > 0) {
			// The Events Calendar supports RRULE format
			// For simplicity, we'll handle basic recurrence patterns
			const rrule = event.recurrence[0];
			if (rrule.includes('FREQ=WEEKLY')) {
				wpEvent.recurrence = {
					type: 'weekly',
					end_type: 'never', // Could be enhanced to parse UNTIL
				};
			} else if (rrule.includes('FREQ=DAILY')) {
				wpEvent.recurrence = {
					type: 'daily',
					end_type: 'never',
				};
			}
		}

		// Handle categories/tags if present in metadata
		if (event.metadata?.categories) {
			wpEvent.categories = event.metadata.categories;
		}

		// Handle custom fields if present in metadata
		if (event.metadata?.customFields) {
			wpEvent.meta = event.metadata.customFields;
		}

		return wpEvent;
	}
}