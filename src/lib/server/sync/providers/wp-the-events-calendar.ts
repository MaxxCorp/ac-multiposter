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
			// Check for existing event to prevent duplication
			// Search by title
			const searchParams = new URLSearchParams();
			searchParams.set('search', event.summary);
			// Also filter by start date if possible to narrow down results
			if (wpEventData.start_date) {
				searchParams.set('start_date', wpEventData.start_date);
			}

			const searchUrl = `${this.baseUrl}/wp-json/tribe/events/v1/events?${searchParams.toString()}`;
			const searchResponse = await fetch(searchUrl, {
				method: 'GET',
				headers: {
					'Authorization': `Basic ${Buffer.from(`${this.username}:${this.applicationPassword}`).toString('base64')}`,
					'Content-Type': 'application/json',
				},
			});

			if (searchResponse.ok) {
				const searchResult = await searchResponse.json();
				if (searchResult.events && searchResult.events.length > 0) {
					// We intentionally only check for title match here because the search param already filtered by title
					// We additionally check date match if multiple results came back or to be sure
					const match = searchResult.events.find((e: any) => {
						// Double check title similarity or exactness if needed
						// API search is fuzzy, so we should check exact title match
						return e.title === event.summary;
					});

					if (match) {
						console.log(`Found existing WordPress event for "${event.summary}", linking instead of creating.`);
						// Determine if we should update it. 
						// For now, let's just return the ID so the mapping is established.
						// The next sync cycle will trigger updateEvent if content differs and etags don't match (if logic supports it).
						// But to be safe and ensure the remote is current, we should probably update it now.
						const updateResult = await this.updateEvent(match.id.toString(), event);
						return {
							externalId: match.id.toString(),
							etag: updateResult.etag
						};
					}
				}
			}

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

		// Format date helper
		const formatDate = (date: Date, timeZone: string | undefined): { date: string, time: string } => {
			// Use provided timezone or UTC as fallback
			const tz = timeZone || 'UTC';

			// Format date part (YYYY-MM-DD)
			const datePart = new Intl.DateTimeFormat('en-CA', { // en-CA gives YYYY-MM-DD
				timeZone: tz,
				year: 'numeric',
				month: '2-digit',
				day: '2-digit'
			}).format(date);

			// Format time part (HH:MM:SS) - The Events Calendar expects seconds
			const timePart = new Intl.DateTimeFormat('en-GB', { // en-GB gives HH:MM:SS (24h)
				timeZone: tz,
				hour: '2-digit',
				minute: '2-digit',
				second: '2-digit',
				hour12: false
			}).format(date);

			return { date: datePart, time: timePart };
		};

		// Handle start date/time
		if (event.startDateTime) {
			const { date, time } = formatDate(event.startDateTime, event.startTimeZone);
			// The Events Calendar expects full datetime string YYYY-MM-DD HH:MM:SS
			wpEvent.start_date = `${date} ${time}`;
			// We can also send explicit GMT if helpful, but start_date + timezone should suffice
			// wpEvent.start_date_gmt = ...
		} else if (event.startDate) {
			wpEvent.start_date = `${event.startDate} 00:00:00`;
			wpEvent.all_day = true;
		}

		// Handle end date/time
		if (event.endDateTime) {
			const { date, time } = formatDate(event.endDateTime, event.endTimeZone || event.startTimeZone);
			wpEvent.end_date = `${date} ${time}`;
		} else if (event.endDate) {
			wpEvent.end_date = `${event.endDate} 23:59:59`;
		}

		// Location/Venue is handled separately via ensureVenue and ID reference

		// Handle timezone
		if (event.startTimeZone) {
			wpEvent.timezone = event.startTimeZone;
		}

		// Handle recurrence if present
		if (event.recurrence && event.recurrence.length > 0) {
			// The Events Calendar supports RRULE format or specific fields
			// API documentation suggests using 'recurrence' object for simple patterns
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

		// Map Website URL
		// Prefer linking to the internal Multiposter event view
		if (event.metadata?.eventId && env.BETTER_AUTH_URL) {
			wpEvent.website = `${env.BETTER_AUTH_URL}/events/${event.metadata.eventId}`;
		} else if (event.source?.url) {
			// Fallback to source URL
			wpEvent.website = event.source.url;
		}

		// Map Cost/Price
		if (event.ticketPrice) {
			wpEvent.cost = event.ticketPrice;
		}

		return wpEvent;
	}
}