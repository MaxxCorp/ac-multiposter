import type {
	SyncProvider,
	SyncConfig,
	ExternalEvent,
	WebhookSubscription,
	ProviderType,
	SyncDirection
} from '../types';
import { calendar, type calendar_v3 } from '@googleapis/calendar';
import { OAuth2Client, type Credentials } from 'google-auth-library';
import { env } from '$env/dynamic/private';
import { db } from '$lib/server/db';
import { account } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';

/**
 * Google Calendar sync provider implementation
 */
export class GoogleCalendarProvider implements SyncProvider {
	readonly type: ProviderType = 'google-calendar';
	readonly name = 'Google Calendar';
	readonly supportsWebhooks = true;
	readonly supportedDirections: SyncDirection[] = ['pull', 'push', 'bidirectional'];
	readonly supportedEntityTypes: ('event' | 'announcement')[] = ['event'];


	private config?: SyncConfig;
	private calendar?: calendar_v3.Calendar;
	private auth?: OAuth2Client;
	private calendarId = 'primary'; // Can be overridden in settings

	async initialize(config: SyncConfig): Promise<void> {
		this.config = config;

		if (config.settings?.calendarId) {
			this.calendarId = config.settings.calendarId as string;
		}

		// Check environment variables
		const clientId = env.GOOGLE_CLIENT_ID;
		const clientSecret = env.GOOGLE_CLIENT_SECRET;
		const authUrl = env.BETTER_AUTH_URL || 'http://localhost:5173';

		if (!clientId || !clientSecret) {
			console.error(`[GoogleCalendarProvider] Missing OAuth credentials:`, {
				hasClientId: !!clientId,
				hasClientSecret: !!clientSecret
			});
			throw new Error('Missing Google OAuth credentials (GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET)');
		}

		// Fetch fresh credentials from the Better Auth account table
		// This ensures we always have the latest tokens rather than stale ones from sync config
		const providerIdMap: Record<string, string> = {
			'google-calendar': 'google',
			'microsoft-calendar': 'microsoft'
		};
		const oauthProviderId = providerIdMap[config.providerType];

		const [userAccount] = await db
			.select()
			.from(account)
			.where(and(
				eq(account.userId, config.userId),
				eq(account.providerId, oauthProviderId)
			))
			.limit(1);

		if (!userAccount) {
			throw new Error(
				`No ${oauthProviderId} account connected. Please reconnect your account.`
			);
		}

		// Use fresh credentials from the account table
		const credentials = {
			accessToken: userAccount.accessToken,
			refreshToken: userAccount.refreshToken,
			expiresAt: userAccount.accessTokenExpiresAt?.getTime()
		};

		if (!credentials?.accessToken) {
			console.error(`[GoogleCalendarProvider] Missing access token`);
			throw new Error('Missing access token for Google Calendar');
		}

		if (!credentials?.refreshToken) {
			console.error(`[GoogleCalendarProvider] Missing refresh token - user needs to re-authenticate`);
			throw new Error('Missing refresh token for Google Calendar. Please disconnect and reconnect your Google account to grant calendar access.');
		}

		// Initialize OAuth2 client and store it as instance property
		this.auth = new OAuth2Client(
			clientId,
			clientSecret,
			`${authUrl}/api/auth/callback/google`
		);

		this.auth.setCredentials({
			access_token: credentials.accessToken,
			refresh_token: credentials.refreshToken,
			expiry_date: credentials.expiresAt
		});

		// Set up token refresh callback to update stored credentials
		this.auth.on('tokens', async (tokens: Credentials) => {
			if (tokens.access_token && this.config) {
				try {
					const providerIdMap: Record<string, string> = {
						'google-calendar': 'google',
						'microsoft-calendar': 'microsoft'
					};
					const oauthProviderId = providerIdMap[this.config.providerType];

					await db
						.update(account)
						.set({
							accessToken: tokens.access_token,
							accessTokenExpiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : undefined,
							refreshToken: tokens.refresh_token || undefined, // Update if rotated
							updatedAt: new Date()
						})
						.where(
							and(
								eq(account.userId, this.config.userId),
								eq(account.providerId, oauthProviderId)
							)
						);

					console.log(`[GoogleCalendarProvider] Refreshed and saved tokens for user ${this.config.userId}`);
				} catch (error) {
					console.error(`[GoogleCalendarProvider] Failed to save refreshed tokens:`, error);
				}
			}
		});

		// The @googleapis/calendar package doesn't properly accept auth in the constructor
		// We need to create the client without auth and then make requests using the auth object
		// by passing it to each API call
		this.calendar = calendar({ version: 'v3' });
	}

	async validateConnection(): Promise<boolean> {
		if (!this.calendar || !this.auth) {
			throw new Error('Provider not initialized');
		}

		try {
			// Use makeRequest to ensure proper authentication and error handling
			const url = `https://www.googleapis.com/calendar/v3/users/me/calendarList?maxResults=1`;
			await this.makeRequest({ url, method: 'GET' });
			return true;
		} catch (error) {
			console.error('Google Calendar connection validation failed:', error);
			return false;
		}
	}

	async pullEvents(syncToken?: string): Promise<{
		events: ExternalEvent[];
		nextSyncToken?: string;
	}> {
		if (!this.calendar || !this.auth) {
			throw new Error('Provider not initialized');
		}

		try {
			// Build query parameters
			const queryParams = new URLSearchParams({
				maxResults: '250'
			});

			// Use sync token for incremental sync, otherwise full sync
			if (syncToken) {
				queryParams.append('syncToken', syncToken);
			} else {
				// For full sync, we can use ordering and time filters
				queryParams.append('singleEvents', 'true');
				queryParams.append('orderBy', 'updated');

				// For full sync, only get events from the past year to now + 2 years
				const now = new Date();
				const pastYear = new Date(now);
				pastYear.setFullYear(now.getFullYear() - 1);
				const futureYears = new Date(now);
				futureYears.setFullYear(now.getFullYear() + 2);

				queryParams.append('timeMin', pastYear.toISOString());
				queryParams.append('timeMax', futureYears.toISOString());
			}

			const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(this.calendarId)}/events?${queryParams.toString()}`;

			const response = await this.makeRequest<calendar_v3.Schema$Events>({
				url,
				method: 'GET'
			});

			const events: ExternalEvent[] = (response.data.items || [])
				// .filter((e: calendar_v3.Schema$Event) => e.status !== 'cancelled') // Don't skip cancelled events, we need to sync deletions
				.map((e: calendar_v3.Schema$Event) => this.mapToExternalEvent(e));

			return {
				events,
				nextSyncToken: response.data.nextSyncToken ?? undefined
			};
		} catch (error: any) {
			console.error(`[GoogleCalendarProvider] pullEvents failed:`, {
				message: error.message,
				code: error.code,
				status: error.status,
				errors: error.errors
			});

			// Handle sync token invalidation (410 = Gone)
			if (error.code === 410) {
				console.warn('[GoogleCalendarProvider] Sync token expired (410), performing full sync');
				return this.pullEvents(); // Retry without sync token
			}

			throw error;
		}
	}

	async pushEvent(event: ExternalEvent): Promise<{ externalId: string; etag?: string }> {
		if (!this.calendar || !this.auth) {
			throw new Error('Provider not initialized');
		}

		const gcalEvent = this.mapToGoogleEvent(event);

		const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(this.calendarId)}/events?sendUpdates=all`;

		const response = await this.makeRequest<{
			id: string;
			etag?: string;
		}>({
			url,
			method: 'POST',
			data: gcalEvent
		});

		return {
			externalId: response.data.id!,
			etag: response.data.etag ?? undefined
		};
	}

	async updateEvent(externalId: string, event: ExternalEvent): Promise<{ etag?: string }> {
		if (!this.calendar || !this.auth) {
			throw new Error('Provider not initialized');
		}

		const gcalEvent = this.mapToGoogleEvent(event);

		const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(this.calendarId)}/events/${encodeURIComponent(externalId)}?sendUpdates=all`;

		const response = await this.makeRequest<{
			etag?: string;
		}>({
			url,
			method: 'PUT',
			data: gcalEvent
		});

		return {
			etag: response.data.etag ?? undefined
		};
	}

	async deleteEvent(externalId: string): Promise<void> {
		if (!this.calendar || !this.auth) {
			throw new Error('Provider not initialized');
		}

		const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(this.calendarId)}/events/${encodeURIComponent(externalId)}`;

		await this.makeRequest({
			url,
			method: 'DELETE'
		});
	}

	async setupWebhook(callbackUrl: string): Promise<WebhookSubscription> {
		if (!this.calendar || !this.config || !this.auth) {
			throw new Error('Provider not initialized');
		}

		const channelId = crypto.randomUUID();
		const resourceId = crypto.randomUUID();

		const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(this.calendarId)}/events/watch`;

		const response = await this.makeRequest<{
			resourceId?: string;
			expiration?: string;
		}>({
			url,
			method: 'POST',
			data: {
				id: channelId,
				type: 'web_hook',
				address: callbackUrl,
				token: this.config.id // Use config ID as verification token
			}
		});

		const expiresAt = new Date(parseInt(response.data.expiration || '0'));
		const id = crypto.randomUUID();

		return {
			id,
			syncConfigId: this.config.id,
			providerId: this.config.providerId,
			resourceId: response.data.resourceId || resourceId,
			channelId,
			expiresAt,
			createdAt: new Date()
		} as WebhookSubscription;
	}

	async renewWebhook(subscription: WebhookSubscription): Promise<WebhookSubscription> {
		// Google Calendar requires stopping the old channel and creating a new one
		await this.cancelWebhook(subscription);

		// Reconstruct callback URL from environment
		const baseUrl = env.BETTER_AUTH_URL || 'https://localhost:5173';
		const callbackUrl = `${baseUrl}/api/sync/webhook/google-calendar`;

		return this.setupWebhook(callbackUrl);
	}

	async cancelWebhook(subscription: WebhookSubscription): Promise<void> {
		if (!this.calendar || !this.auth) {
			throw new Error('Provider not initialized');
		}

		try {
			const url = 'https://www.googleapis.com/calendar/v3/channels/stop';

			await this.makeRequest({
				url,
				method: 'POST',
				data: {
					id: subscription.channelId,
					resourceId: subscription.resourceId
				}
			});
		} catch (error) {
			console.error('Failed to cancel Google Calendar webhook:', error);
			// Don't throw - webhook may have already expired
		}
	}

	private async makeRequest<T = any>(opts: any, retry = true): Promise<{ data: T }> {
		if (!this.auth) throw new Error('Provider not initialized');

		try {
			return await this.auth.request<T>(opts);
		} catch (error: any) {
			// Handle authentication errors
			if (retry && (error.code === 401 || error.code === 403)) {
				console.warn('[GoogleCalendarProvider] Request failed with 401/403. Attempting token refresh...');

				try {
					// Force refresh access token
					const { credentials } = await this.auth.refreshAccessToken();
					this.auth.setCredentials(credentials);

					// Update DB with new tokens
					if (credentials.access_token && this.config) {
						const providerIdMap: Record<string, string> = {
							'google-calendar': 'google',
							'microsoft-calendar': 'microsoft'
						};
						const oauthProviderId = providerIdMap[this.config.providerType];

						await db
							.update(account)
							.set({
								accessToken: credentials.access_token,
								accessTokenExpiresAt: credentials.expiry_date ? new Date(credentials.expiry_date) : undefined,
								refreshToken: credentials.refresh_token || undefined,
								updatedAt: new Date()
							})
							.where(
								and(
									eq(account.userId, this.config.userId),
									eq(account.providerId, oauthProviderId)
								)
							);
						console.log(`[GoogleCalendarProvider] Manually refreshed and saved tokens for user ${this.config.userId}`);
					}

					// Retry request with new token
					return await this.auth.request<T>(opts);
				} catch (refreshError: any) {
					console.error('[GoogleCalendarProvider] Token refresh failed:', refreshError);
					throw new Error(`Google Calendar authentication failed: ${refreshError.message}. Please re-authenticate.`);
				}
			}

			// If it wasn't an auth error or retry failed, throw original or wrapped error
			if (error.code === 401 || error.code === 403) {
				throw new Error(`Google Calendar authentication failed: ${error.message}. Please re-authenticate.`);
			}

			throw error;
		}
	}

	async processWebhook(payload: any): Promise<{
		changes: Array<{ externalId: string; changeType: 'created' | 'updated' | 'deleted' }>;
	}> {
		// Google Calendar webhooks don't include change details
		// They just notify that something changed, requiring a sync
		// We'll trigger a pull to get the actual changes
		const { events } = await this.pullEvents(this.config?.syncToken);

		// Map events to changes (all treated as updated for simplicity)
		// We need to fetch all events because we don't know which one changed
		// Realistically we should use sync tokens properly to get deltas
		const changes = events.map((event) => ({
			externalId: event.externalId,
			changeType: 'updated' as const
		}));

		return { changes };
	}

	private mapToExternalEvent(gcalEvent: calendar_v3.Schema$Event): ExternalEvent {
		return {
			externalId: gcalEvent.id!,
			providerId: this.config!.providerId,
			summary: gcalEvent.summary || 'Untitled Event',
			status: (gcalEvent.status as 'confirmed' | 'tentative' | 'cancelled') ?? undefined,
			description: gcalEvent.description ?? undefined,
			location: gcalEvent.location ?? undefined,
			startDate: gcalEvent.start?.date ?? undefined,
			startDateTime: gcalEvent.start?.dateTime ? new Date(gcalEvent.start.dateTime) : undefined,
			startTimeZone: gcalEvent.start?.timeZone ?? undefined,
			endDate: gcalEvent.end?.date ?? undefined,
			endDateTime: gcalEvent.end?.dateTime ? new Date(gcalEvent.end.dateTime) : undefined,
			endTimeZone: gcalEvent.end?.timeZone ?? undefined,
			attendees: gcalEvent.attendees?.map((a: calendar_v3.Schema$EventAttendee) => ({
				email: a.email!,
				displayName: a.displayName ?? undefined,
				responseStatus: a.responseStatus ?? undefined
			})),
			recurrence: gcalEvent.recurrence ?? undefined,
			reminders: gcalEvent.reminders
				? {
					useDefault: gcalEvent.reminders.useDefault || false,
					overrides: gcalEvent.reminders.overrides?.map((r: calendar_v3.Schema$EventReminder) => ({
						method: r.method!,
						minutes: r.minutes!
					}))
				}
				: undefined,
			etag: gcalEvent.etag ?? undefined,
			updatedAt: gcalEvent.updated ? new Date(gcalEvent.updated) : undefined,
			metadata: {
				htmlLink: gcalEvent.htmlLink,
				colorId: gcalEvent.colorId,
				visibility: gcalEvent.visibility,
				transparency: gcalEvent.transparency,
				// Extract our internal ID if present to prevent echoes
				app_event_id: gcalEvent.extendedProperties?.private?.app_event_id
			}
		};
	}

	private mapToGoogleEvent(event: ExternalEvent): calendar_v3.Schema$Event {
		const gcalEvent: calendar_v3.Schema$Event = {
			summary: event.summary,
			description: event.description,
			location: event.location,
			start: {},
			end: {},
			attendees: event.attendees?.map((a) => ({
				email: a.email,
				displayName: a.displayName,
				responseStatus: a.responseStatus
			})),
			recurrence: event.recurrence
		};

		// Handle start time
		if (event.startDateTime) {
			gcalEvent.start!.dateTime = event.startDateTime.toISOString();
			gcalEvent.start!.timeZone = event.startTimeZone;
		} else if (event.startDate) {
			gcalEvent.start!.date = event.startDate;
		}

		// Handle end time
		if (event.endDateTime) {
			gcalEvent.end!.dateTime = event.endDateTime.toISOString();
			gcalEvent.end!.timeZone = event.endTimeZone;
		} else if (event.endDate) {
			gcalEvent.end!.date = event.endDate;
		}

		// Apply metadata if available
		if (event.metadata) {
			gcalEvent.colorId = event.metadata.colorId;
			gcalEvent.visibility = event.metadata.visibility;
			gcalEvent.transparency = event.metadata.transparency;

			// Store our internal ID in private extended properties
			if (event.metadata.app_event_id) {
				gcalEvent.extendedProperties = {
					private: {
						app_event_id: event.metadata.app_event_id
					}
				};
			}
		}

		// Ensure proper reminders format
		// Cannot specify both default reminders and overrides at the same time
		if (event.reminders) {
			if (event.reminders.overrides && event.reminders.overrides.length > 0) {
				gcalEvent.reminders = {
					useDefault: false,
					overrides: event.reminders.overrides
				};
			} else {
				gcalEvent.reminders = {
					useDefault: event.reminders.useDefault,
					overrides: []
				};
			}
		}

		return gcalEvent;
	}
}
