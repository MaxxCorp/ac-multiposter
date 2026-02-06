import type {
	SyncProvider,
	SyncConfig,
	ExternalEvent,
	ProviderType,
	SyncDirection
} from '../types';
import { env } from '$env/dynamic/private';

/**
 * WordPress The Events Calendar sync provider implementation
 * Pushes events to a WordPress site with The Events Calendar plugin
 */
export class WpTheEventsCalendarProvider implements SyncProvider {
	readonly type: ProviderType = 'wp-the-events-calendar';
	readonly name = 'WP The Events Calendar';
	readonly supportsWebhooks = false;
	readonly supportedDirections: SyncDirection[] = ['push'];
	readonly supportedEntityTypes: ('event' | 'announcement')[] = ['event'];


	private config?: SyncConfig;
	private baseUrl = '';
	private username = '';
	private applicationPassword = '';

	async initialize(config: SyncConfig): Promise<void> {
		this.config = config;

		// Get WordPress credentials from environment variables
		this.baseUrl = env.WP_EVENTS_CALENDAR_BASE_URL || '';
		this.username = env.WP_EVENTS_CALENDAR_USERNAME || '';
		this.applicationPassword = env.WP_EVENTS_CALENDAR_APP_PASSWORD || '';

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
			// Ensure venue exists if provided
			if (event.venue) {
				const venueId = await this.ensureVenue(event.venue);
				if (venueId) {
					wpEventData.venue = venueId;
				}
			}

			// Ensure organizer exists if provided
			if (event.organizer) {
				const organizerId = await this.ensureOrganizer(event.organizer);
				if (organizerId) {
					wpEventData.organizer = organizerId;
				}
			}

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
			// Ensure venue exists if provided
			if (event.venue) {
				const venueId = await this.ensureVenue(event.venue);
				if (venueId) {
					wpEventData.venue = venueId;
				}
			}

			// Ensure organizer exists if provided
			if (event.organizer) {
				const organizerId = await this.ensureOrganizer(event.organizer);
				if (organizerId) {
					wpEventData.organizer = organizerId;
				}
			}

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

	/**
	 * Ensure valid venue exists in WordPress
	 * @param venue Venue data
	 * @returns Venue ID
	 */
	private async ensureVenue(venue: NonNullable<ExternalEvent['venue']>): Promise<number | undefined> {
		try {
			// Search for existing venue by name
			const searchParams = new URLSearchParams();
			searchParams.set('search', venue.name);

			const searchUrl = `${this.baseUrl}/wp-json/tribe/events/v1/venues?${searchParams.toString()}`;
			const searchResponse = await fetch(searchUrl, {
				method: 'GET',
				headers: {
					'Authorization': `Basic ${Buffer.from(`${this.username}:${this.applicationPassword}`).toString('base64')}`,
					'Content-Type': 'application/json',
				},
			});

			if (searchResponse.ok) {
				const searchResult = await searchResponse.json();
				if (searchResult.venues && searchResult.venues.length > 0) {
					// Use the first match
					// Optionally: Check for exact match or update details if needed
					return searchResult.venues[0].id;
				}
			}

			// Create new venue
			const venueData: any = {
				venue: venue.name,
				address: venue.address,
				city: venue.city,
				country: venue.country,
				province: venue.province,
				zip: venue.zip,
				phone: venue.phone,
				website: venue.website,
				show_map: true,
				show_map_link: true,
			};

			const createResponse = await fetch(`${this.baseUrl}/wp-json/tribe/events/v1/venues`, {
				method: 'POST',
				headers: {
					'Authorization': `Basic ${Buffer.from(`${this.username}:${this.applicationPassword}`).toString('base64')}`,
					'Content-Type': 'application/json',
				},
				body: JSON.stringify(venueData),
			});

			if (createResponse.ok) {
				const createdVenue = await createResponse.json();
				return createdVenue.id;
			} else {
				const errorText = await createResponse.text();
				console.error(`Failed to create venue in WordPress: ${createResponse.status} - ${errorText}`);
			}
		} catch (error) {
			console.error('Error ensuring venue in WordPress:', error);
		}

		return undefined;
	}

	/**
	 * Ensure valid organizer exists in WordPress
	 * @param organizer Organizer data
	 * @returns Organizer ID
	 */
	private async ensureOrganizer(organizer: NonNullable<ExternalEvent['organizer']>): Promise<number | undefined> {
		try {
			// Search for existing organizer by email (more reliable than name) or name
			// The Events Calendar API allows searching by string
			const searchParams = new URLSearchParams();
			searchParams.set('search', organizer.email || organizer.name);

			const searchUrl = `${this.baseUrl}/wp-json/tribe/events/v1/organizers?${searchParams.toString()}`;
			const searchResponse = await fetch(searchUrl, {
				method: 'GET',
				headers: {
					'Authorization': `Basic ${Buffer.from(`${this.username}:${this.applicationPassword}`).toString('base64')}`,
					'Content-Type': 'application/json',
				},
			});

			if (searchResponse.ok) {
				const searchResult = await searchResponse.json();
				if (searchResult.organizers && searchResult.organizers.length > 0) {
					// Check for exact email match if email is provided
					if (organizer.email) {
						const match = searchResult.organizers.find((o: any) => o.email === organizer.email);
						if (match) return match.id;
					}
					// Check for exact name match
					const match = searchResult.organizers.find((o: any) => o.organizer === organizer.name);
					if (match) return match.id;

					// If strictly searching, we might not want to return a fuzzy match, but for now lets try to be helpful
					// return searchResult.organizers[0].id;
				}
			}

			// Create new organizer
			const organizerData: any = {
				organizer: organizer.name,
				email: organizer.email,
				phone: organizer.phone,
				website: organizer.website,
			};

			const createResponse = await fetch(`${this.baseUrl}/wp-json/tribe/events/v1/organizers`, {
				method: 'POST',
				headers: {
					'Authorization': `Basic ${Buffer.from(`${this.username}:${this.applicationPassword}`).toString('base64')}`,
					'Content-Type': 'application/json',
				},
				body: JSON.stringify(organizerData),
			});

			if (createResponse.ok) {
				const createdOrganizer = await createResponse.json();
				return createdOrganizer.id;
			} else {
				const errorText = await createResponse.text();
				console.error(`Failed to create organizer in WordPress: ${createResponse.status} - ${errorText}`);
			}
		} catch (error) {
			console.error('Error ensuring organizer in WordPress:', error);
		}

		return undefined;
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

		// Location/Venue is handled separately via ensureVenue and ID reference
		// But fallback to embedded venue data if ensureVenue fails or for simple string locations is preserved?
		// Actually, standard WP API expects 'venue' to be an ID or structured data for creation
		// But we are now using ID reference strategy.
		// Old code:
		/*
		if (event.location) {
			wpEvent.venue = {
				venue: event.location,
			};
		}
		*/
		// We will rely on the ensureVenue ID injection in pushEvent/updateEvent.

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

		// Map additional available fields
		if (event.metadata?.image) {
			// Feature image handling would require uploading media first, which is complex.
			// Skipping for now unless requested.
		}

		if (event.source?.url) {
			wpEvent.website = event.source.url;
		}

		if (event.ticketPrice) { // We added ticketPrice to Internal event schema but not External yet?
			// Need to check if ExternalEvent has cost/price field.
			// If added to external event, map it here.
			// wpEvent.cost = event.price;
		}

		return wpEvent;
	}
}