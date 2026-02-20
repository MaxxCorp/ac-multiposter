import type {
	SyncProvider,
	SyncConfig,
	ExternalEvent,
	ProviderType,
	SyncDirection
} from '../types';
import { env } from '$env/dynamic/private';
import { db } from '../../db';
import { syncMapping } from '../../db/schema';
import { eq, and } from 'drizzle-orm';
import crypto from 'crypto';

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
				const venueId = await this.ensureVenue(event.venue, event.metadata?.locationId || event.venueId);
				if (venueId) {
					// API expects array of IDs
					wpEventData.venue = [venueId];
				}
			}

			// Ensure organizer exists if provided
			if (event.organizer) {
				const organizerId = await this.ensureOrganizer(event.organizer, event.metadata?.organizerId); // organizerId passed in metadata
				if (organizerId) {
					// API expects array of IDs
					wpEventData.organizer = [organizerId];
				}
			}

			// Ensure tags
			if (event.tags && event.tags.length > 0) {
				const tagIds: number[] = [];
				for (const tag of event.tags) {
					const tagId = await this.ensureTag(tag);
					if (tagId) tagIds.push(tagId);
				}
				if (tagIds.length > 0) {
					wpEventData.tags = tagIds;
				}
			}

			// Ensure image
			let mediaData: { id: number; url: string } | undefined;
			if (event.image) {
				console.log(`[WP-Sync] Ensuring image: ${event.image.url}`);
				mediaData = await this.ensureImage(event.image);
				if (mediaData) {
					console.log(`[WP-Sync] Image ensured with ID: ${mediaData.id}`);
					wpEventData.image = mediaData.url; // Use URL as requested
				} else {
					console.warn(`[WP-Sync] Failed to ensure image`);
				}
			}

			console.log(`[WP-Sync] Posting event to WordPress:`, JSON.stringify(wpEventData, null, 2));

			// POST Event
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

			// Post-link media if we have it
			if (mediaData && createdEvent.id) {
				console.log(`[WP-Sync] Linking media ${mediaData.id} to event ${createdEvent.id}`);
				await fetch(`${this.baseUrl}/wp-json/wp/v2/media/${mediaData.id}`, {
					method: 'POST',
					headers: {
						'Authorization': `Basic ${Buffer.from(`${this.username}:${this.applicationPassword}`).toString('base64')}`,
						'Content-Type': 'application/json',
					},
					body: JSON.stringify({ post: createdEvent.id }),
				});
			}

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
				const venueId = await this.ensureVenue(event.venue, event.metadata?.locationId || event.venueId);
				if (venueId) {
					// API expects array of IDs
					wpEventData.venue = [venueId];
				}
			}

			// Ensure organizer exists if provided
			if (event.organizer) {
				const organizerId = await this.ensureOrganizer(event.organizer, event.metadata?.organizerId); // organizerId passed in metadata
				if (organizerId) {
					// API expects array of IDs
					wpEventData.organizer = [organizerId];
				}
			}

			// Ensure tags
			if (event.tags && event.tags.length > 0) {
				const tagIds: number[] = [];
				for (const tag of event.tags) {
					const tagId = await this.ensureTag(tag);
					if (tagId) tagIds.push(tagId);
				}
				if (tagIds.length > 0) {
					wpEventData.tags = tagIds;
				}
			}

			// Ensure image
			let mediaData: { id: number; url: string } | undefined;
			if (event.image) {
				mediaData = await this.ensureImage(event.image);
				if (mediaData) {
					wpEventData.image = mediaData.url;
				}
			}

			console.log(`[WP-Sync] Updating event ${externalId} in WordPress:`, JSON.stringify(wpEventData, null, 2));

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

			// Post-link media if we have it
			if (mediaData) {
				console.log(`[WP-Sync] Linking media ${mediaData.id} to event ${externalId}`);
				await fetch(`${this.baseUrl}/wp-json/wp/v2/media/${mediaData.id}`, {
					method: 'POST',
					headers: {
						'Authorization': `Basic ${Buffer.from(`${this.username}:${this.applicationPassword}`).toString('base64')}`,
						'Content-Type': 'application/json',
					},
					body: JSON.stringify({ post: externalId }),
				});
			}

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
			const response = await fetch(`${this.baseUrl}/wp-json/tribe/events/v1/events/${externalId}?force=true`, {
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
	 * @param internalId Internal Location ID
	 * @returns Venue ID
	 */
	private async ensureVenue(venue: NonNullable<ExternalEvent['venue']>, internalId?: string): Promise<number | undefined> {
		if (!this.config) return undefined;

		try {
			// 1. Check mapping
			if (internalId) {
				const [mapping] = await db
					.select()
					.from(syncMapping)
					.where(and(
						eq(syncMapping.syncConfigId, this.config.id),
						eq(syncMapping.locationId, internalId)
					));

				if (mapping) {
					try {
						const venueData: any = {
							venue: venue.name,
							address: venue.address,
							city: venue.city,
							country: venue.country,
							province: venue.province,
							zip: venue.zip,
							phone: venue.phone,
							website: venue.website,
						};

						await fetch(`${this.baseUrl}/wp-json/tribe/events/v1/venues/${mapping.externalId}`, {
							method: 'POST',
							headers: {
								'Authorization': `Basic ${Buffer.from(`${this.username}:${this.applicationPassword}`).toString('base64')}`,
								'Content-Type': 'application/json',
							},
							body: JSON.stringify(venueData),
						});
					} catch (e) {
						console.error('[WP-Sync] Failed to update venue:', e);
					}

					return parseInt(mapping.externalId, 10);
				}
			}

			// 2. Search for existing venue by name
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

			let externalId: string | undefined;

			if (searchResponse.ok) {
				const searchResult = await searchResponse.json();
				if (searchResult.venues && searchResult.venues.length > 0) {
					externalId = searchResult.venues[0].id.toString();
				}
			}

			// 3. Create new venue if not found
			if (!externalId) {
				console.log(`[WP-Sync] Creating new venue: ${venue.name}`);
				const venueData: any = {
					venue: venue.name,
					address: venue.address,
					city: venue.city,
					country: venue.country,
					province: venue.province,
					zip: venue.zip,
					phone: venue.phone,
					website: venue.website,
					show_map: 'true',
					show_map_link: 'true',
					status: 'publish', // Ensure it's available immediately
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
					externalId = createdVenue.id.toString();
				} else {
					const errorText = await createResponse.text();
					console.error(`Failed to create venue in WordPress: ${createResponse.status} - ${errorText}`);
				}
			}

			// 4. Save mapping
			if (externalId && internalId) {
				// Check again if mapping was created concurrently (safe guard)
				// Or just insert
				await db.insert(syncMapping).values({
					syncConfigId: this.config.id,
					externalId: externalId,
					providerId: this.config.providerId,
					locationId: internalId,
					lastSyncedAt: new Date()
				});
			}

			return externalId ? parseInt(externalId, 10) : undefined;

		} catch (error) {
			console.error('Error ensuring venue in WordPress:', error);
		}

		return undefined;
	}

	/**
	 * Ensure valid organizer exists in WordPress
	 * @param organizer Organizer data
	 * @param internalId Internal Contact ID
	 * @returns Organizer ID
	 */
	private async ensureOrganizer(organizer: NonNullable<ExternalEvent['organizer']>, internalId?: string): Promise<number | undefined> {
		if (!this.config) return undefined;

		try {
			// 1. Check mapping
			if (internalId) {
				const [mapping] = await db
					.select()
					.from(syncMapping)
					.where(and(
						eq(syncMapping.syncConfigId, this.config.id),
						eq(syncMapping.contactId, internalId)
					));

				if (mapping) {
					try {
						const organizerData: any = {
							organizer: organizer.name,
							email: organizer.email,
							phone: organizer.phone,
							website: organizer.website,
						};

						await fetch(`${this.baseUrl}/wp-json/tribe/events/v1/organizers/${mapping.externalId}`, {
							method: 'POST',
							headers: {
								'Authorization': `Basic ${Buffer.from(`${this.username}:${this.applicationPassword}`).toString('base64')}`,
								'Content-Type': 'application/json',
							},
							body: JSON.stringify(organizerData),
						});
					} catch (e) {
						console.error('[WP-Sync] Failed to update organizer:', e);
					}

					return parseInt(mapping.externalId, 10);
				}
			}

			// 2. Search
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

			let externalId: string | undefined;

			if (searchResponse.ok) {
				const searchResult = await searchResponse.json();
				if (searchResult.organizers && searchResult.organizers.length > 0) {
					if (organizer.email) {
						const match = searchResult.organizers.find((o: any) => o.email === organizer.email);
						if (match) externalId = match.id.toString();
					}
					if (!externalId) {
						const match = searchResult.organizers.find((o: any) => o.organizer === organizer.name);
						if (match) externalId = match.id.toString();
					}
				}
			}

			// 3. Create
			if (!externalId) {
				const organizerData: any = {
					organizer: organizer.name,
					email: organizer.email,
					phone: organizer.phone,
					website: organizer.website,
					status: 'publish', // Ensure it's available immediately
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
					externalId = createdOrganizer.id.toString();
				} else {
					console.error(`Failed to create organizer in WordPress: ${createResponse.status}`);
				}
			}

			// 4. Save mapping
			if (externalId && internalId) {
				await db.insert(syncMapping).values({
					syncConfigId: this.config.id,
					externalId: externalId,
					providerId: this.config.providerId,
					contactId: internalId,
					lastSyncedAt: new Date()
				});
			}

			return externalId ? parseInt(externalId, 10) : undefined;
		} catch (error) {
			console.error('Error ensuring organizer in WordPress:', error);
		}

		return undefined;
	}

	/**
	 * Ensure valid tag exists in WordPress
	 * @param tag Tag data
	 * @returns Tag ID
	 */
	private async ensureTag(tag: { id: string; name: string }): Promise<number | undefined> {
		if (!this.config) return undefined;

		try {
			// 1. Check mapping
			const [mapping] = await db
				.select()
				.from(syncMapping)
				.where(and(
					eq(syncMapping.syncConfigId, this.config.id),
					eq(syncMapping.tagId, tag.id)
				));

			if (mapping) {
				return parseInt(mapping.externalId, 10);
			}

			// 2. Search
			const searchParams = new URLSearchParams();
			searchParams.set('search', tag.name);
			const searchUrl = `${this.baseUrl}/wp-json/wp/v2/tags?${searchParams.toString()}`;
			const searchResponse = await fetch(searchUrl, {
				method: 'GET',
				headers: {
					'Authorization': `Basic ${Buffer.from(`${this.username}:${this.applicationPassword}`).toString('base64')}`,
					'Content-Type': 'application/json',
				},
			});

			let externalId: string | undefined;

			if (searchResponse.ok) {
				const tags = await searchResponse.json();
				if (tags && tags.length > 0) {
					const match = tags.find((t: any) => t.name.toLowerCase() === tag.name.toLowerCase());
					if (match) externalId = match.id.toString();
				}
			}

			// 3. Create
			if (!externalId) {
				const createResponse = await fetch(`${this.baseUrl}/wp-json/wp/v2/tags`, {
					method: 'POST',
					headers: {
						'Authorization': `Basic ${Buffer.from(`${this.username}:${this.applicationPassword}`).toString('base64')}`,
						'Content-Type': 'application/json',
					},
					body: JSON.stringify({ name: tag.name }),
				});

				if (createResponse.ok) {
					const createdTag = await createResponse.json();
					externalId = createdTag.id.toString();
				}
			}

			// 4. Save mapping
			if (externalId) {
				await db.insert(syncMapping).values({
					syncConfigId: this.config.id,
					externalId: externalId,
					providerId: this.config.providerId,
					tagId: tag.id,
					lastSyncedAt: new Date()
				});
			}

			return externalId ? parseInt(externalId, 10) : undefined;
		} catch (error) {
			console.error('Error ensuring tag in WordPress:', error);
		}
		return undefined;
	}

	/**
	 * Ensure image exists in WordPress
	 * @param image Image data
	 * @returns Media ID and URL
	 */
	private async ensureImage(image: { url: string; title?: string }): Promise<{ id: number; url: string } | undefined> {
		try {
			console.log(`[WP-Sync] ensureImage check for: ${image.url}`);

			// 1. Download the image first so we can hash it for deduplication
			const imageResponse = await fetch(image.url);
			if (!imageResponse.ok) return undefined;

			const arrayBuffer = await imageResponse.arrayBuffer();
			const buffer = Buffer.from(arrayBuffer);

			// 2. Hash the image buffer
			const hash = crypto.createHash('sha256').update(buffer).digest('hex').substring(0, 16);

			const filename = image.url.split('/').pop() || 'image.jpg';
			const safeFilename = filename.toLowerCase().replace(/[^a-z0-9.]/g, '-').replace(/-+/g, '-');

			// Create a precise slug based on the hash to guarantee finding it later
			const nameWithoutExt = safeFilename.split('.')[0];
			const uniqueSlug = `${hash}-${nameWithoutExt}`.substring(0, 100); // WP slugs have length limits
			const uploadFilename = `${hash}-${safeFilename}`;

			// 3. Search WordPress by this exact hash-slug
			const slugParams = new URLSearchParams();
			slugParams.set('slug', uniqueSlug);
			slugParams.set('media_type', 'image');

			const searchUrl = `${this.baseUrl}/wp-json/wp/v2/media?${slugParams.toString()}`;
			const searchResponse = await fetch(searchUrl, {
				method: 'GET',
				headers: {
					'Authorization': `Basic ${Buffer.from(`${this.username}:${this.applicationPassword}`).toString('base64')}`,
				},
			});

			if (searchResponse.ok) {
				const media = await searchResponse.json();
				// Reuse if found
				if (media.length > 0) {
					console.log(`[WP-Sync] Image hash match found! Reusing media ID: ${media[0].id}`);
					return { id: media[0].id, url: media[0].source_url };
				}
			}

			// 4. Upload if not found
			console.log(`[WP-Sync] Image hash not found, uploading as: ${uploadFilename}`);
			const uploadResponse = await fetch(`${this.baseUrl}/wp-json/wp/v2/media`, {
				method: 'POST',
				headers: {
					'Authorization': `Basic ${Buffer.from(`${this.username}:${this.applicationPassword}`).toString('base64')}`,
					'Content-Disposition': `attachment; filename="${uploadFilename}"`,
					'Content-Type': imageResponse.headers.get('content-type') || 'image/jpeg',
				},
				body: buffer,
			});

			if (uploadResponse.ok) {
				const uploadedMedia = await uploadResponse.json();
				return { id: uploadedMedia.id, url: uploadedMedia.source_url };
			} else {
				const errorText = await uploadResponse.text();
				console.error(`[WP-Sync] Failed to upload image to WordPress: ${uploadResponse.status} ${uploadResponse.statusText}`);
				console.error(`[WP-Sync] Error response: ${errorText}`);
			}

		} catch (error) {
			console.error('Error ensuring image in WordPress:', error);
		}
		return undefined;
	}

	private mapEventToWpFormat(event: ExternalEvent): any {
		// Map our internal event format to WordPress Events Calendar REST API format
		const wpEvent: any = {
			title: event.summary,
			content: event.description || '',
			status: 'publish', // Publish immediately
			hide_from_listings: false,
			show_map: 'true',
			show_map_link: 'true',
		};

		// Resolve timezone, falling back to Europe/Berlin (since we must provide a timezone to WP to avoid offsets)
		const resolvedTz = event.startTimeZone || process.env.TZ || 'Europe/Berlin';

		// Format date helper
		const formatDate = (date: Date, timeZone: string): { date: string, time: string } => {
			const tz = timeZone;

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
			const { date, time } = formatDate(event.startDateTime, resolvedTz);
			if (event.isAllDay) {
				wpEvent.start_date = `${date} 00:00:00`;
				wpEvent.all_day = true;
			} else {
				wpEvent.start_date = `${date} ${time}`;
			}
		}

		// Handle end date/time
		if (event.endDateTime) {
			const { date, time } = formatDate(event.endDateTime, event.endTimeZone || resolvedTz);
			if (event.isAllDay) {
				wpEvent.end_date = `${date} 23:59:59`;
			} else {
				wpEvent.end_date = `${date} ${time}`;
			}
		}

		// Always explicitly include the mapped timezone so WP Events Calendar evaluates the time string properly
		wpEvent.timezone = resolvedTz;

		// Handle recurrence if present
		if (event.recurrence && event.recurrence.length > 0) {
			const rrule = event.recurrence[0];
			if (rrule.includes('FREQ=WEEKLY')) {
				wpEvent.recurrence = {
					type: 'weekly',
					end_type: 'never',
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

		// Map Website URL
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