import type {
	SyncProvider,
	SyncConfig,
	ExternalEvent,
	ProviderType,
	SyncDirection
} from '../types';
import { getAuthenticatedUser } from '$lib/authorization';
import { getEntityContacts } from '../../contacts';
import { db } from '../../db';
import { user, eventResource } from '../../db/schema';

/**
 * Bewegungsatlas.Berlin sync provider implementation
 * Pushes events to Bewegungsatlas.Berlin after login authentication
 */
export class BewegungsatlasBerlinProvider implements SyncProvider {
	readonly type: ProviderType = 'bewegungsatlas-berlin';
	readonly name = 'Bewegungsatlas.Berlin';
	readonly supportsWebhooks = false;
	readonly supportedDirections: SyncDirection[] = ['push'];
	readonly supportedEntityTypes: ('event' | 'announcement')[] = ['event'];


	private config?: SyncConfig;
	private baseUrl = 'https://www.bewegungsatlas.berlin';
	private username = '';
	private password = '';
	private sessionCookies: string[] = [];

	async initialize(config: SyncConfig): Promise<void> {
		this.config = config;

		// Get credentials from config settings
		this.username = config.settings?.username || '';
		this.password = config.settings?.password || '';

		if (!this.username || !this.password) {
			throw new Error('Bewegungsatlas.Berlin credentials (username and password) are required in sync config settings');
		}
	}

	async validateConnection(): Promise<boolean> {
		try {
			// Try to login and check if successful
			await this.ensureAuthenticated();
			return this.sessionCookies.length > 0;
		} catch (error) {
			console.error('Failed to validate Bewegungsatlas.Berlin connection:', error);
			return false;
		}
	}

	async pullEvents(syncToken?: string): Promise<{
		events: ExternalEvent[];
		nextSyncToken?: string;
	}> {
		// Push-only provider doesn't support pulling
		throw new Error('Bewegungsatlas.Berlin provider only supports push operations');
	}

	async pushEvent(event: ExternalEvent): Promise<{ externalId: string; etag?: string }> {
		if (!this.config) {
			throw new Error('Provider not initialized');
		}

		// Ensure we're authenticated
		await this.ensureAuthenticated();

		// Get user record for contact info fallback
		const user = getAuthenticatedUser();
		const userRecord = await db.query.user.findFirst({
			where: (u, { eq }) => eq(u.id, user.id)
		});

		if (!userRecord) {
			throw new Error('User record not found');
		}

		// Map event to form data
		const formData = await this.mapEventToFormData(event, userRecord);

		// Submit the event
		const response = await fetch(`${this.baseUrl}/events/new`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/x-www-form-urlencoded',
				'Cookie': this.sessionCookies.join('; '),
				'User-Agent': 'AC-Multiposter/1.0',
				'Referer': `${this.baseUrl}/events/new`
			},
			body: new URLSearchParams(formData).toString(),
			redirect: 'manual' // Don't follow redirects automatically
		});

		if (!response.ok && response.status !== 302) {
			const errorText = await response.text().catch(() => 'Unknown error');
			console.error('[BewegungsatlasBerlinProvider] Failed to submit event:', {
				status: response.status,
				statusText: response.statusText,
				error: errorText
			});
			throw new Error(`Failed to submit event to Bewegungsatlas.Berlin: ${response.status} ${response.statusText}`);
		}

		// Check if we got redirected (success) or stayed on the form (error)
		if (response.status === 302) {
			// Success - redirected after submission
			const location = response.headers.get('location');
			if (location && location.includes('events/new')) {
				// Redirected back to form - likely an error
				throw new Error('Event submission failed - redirected back to form');
			}
			// Generate external ID
			const externalId = `bewegungsatlas-${event.externalId || crypto.randomUUID()}`;
			return { externalId };
		} else {
			// Check response content for success indicators
			const responseText = await response.text();
			if (responseText.includes('success') || responseText.includes('erfolgreich') || responseText.includes('Event erstellt')) {
				const externalId = `bewegungsatlas-${event.externalId || crypto.randomUUID()}`;
				return { externalId };
			} else {
				throw new Error('Event submission failed - no success indicator found');
			}
		}
	}

	async updateEvent(externalId: string, event: ExternalEvent): Promise<{ etag?: string }> {
		// Bewegungsatlas.Berlin doesn't support updates through the web interface
		// We'll treat updates as new submissions
		return this.pushEvent(event);
	}

	async deleteEvent(externalId: string): Promise<void> {
		// Bewegungsatlas.Berlin doesn't support deletions through the web interface
		console.warn(`Bewegungsatlas.Berlin provider doesn't support event deletion for ${externalId}`);
	}

	private async ensureAuthenticated(): Promise<void> {
		if (this.sessionCookies.length > 0) {
			// Check if session is still valid by making a test request
			try {
				const testResponse = await fetch(`${this.baseUrl}/wp-admin/admin-ajax.php`, {
					method: 'HEAD',
					headers: {
						'Cookie': this.sessionCookies.join('; ')
					}
				});
				if (testResponse.ok) {
					return; // Session still valid
				}
			} catch {
				// Session check failed, re-authenticate
			}
		}

		// Need to authenticate
		await this.authenticate();
	}

	private async authenticate(): Promise<void> {
		// First, get the login page to establish session and get any required tokens
		const loginPageResponse = await fetch(`${this.baseUrl}/anmelden/`, {
			method: 'GET',
			headers: {
				'User-Agent': 'AC-Multiposter/1.0'
			}
		});

		if (!loginPageResponse.ok) {
			throw new Error('Failed to load login page');
		}

		// Extract cookies from the response
		const setCookieHeaders = loginPageResponse.headers.get('set-cookie');
		if (setCookieHeaders) {
			this.sessionCookies = setCookieHeaders.split(',').map(cookie => cookie.trim());
		}

		// Prepare login data
		const loginData = new URLSearchParams();
		loginData.append('log', this.username);
		loginData.append('pwd', this.password);
		loginData.append('wp-submit', 'Anmelden');
		loginData.append('redirect_to', `${this.baseUrl}/wp-admin/`);
		loginData.append('testcookie', '1');

		// Submit login
		const loginResponse = await fetch(`${this.baseUrl}/wp-login.php`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/x-www-form-urlencoded',
				'Cookie': this.sessionCookies.join('; '),
				'User-Agent': 'AC-Multiposter/1.0',
				'Referer': `${this.baseUrl}/anmelden/`
			},
			body: loginData.toString(),
			redirect: 'manual'
		});

		if (!loginResponse.ok && loginResponse.status !== 302) {
			throw new Error(`Login failed: ${loginResponse.status} ${loginResponse.statusText}`);
		}

		// Update cookies from login response
		const loginCookies = loginResponse.headers.get('set-cookie');
		if (loginCookies) {
			const newCookies = loginCookies.split(',').map(cookie => cookie.trim());
			this.sessionCookies.push(...newCookies);
		}

		// Check if login was successful by checking redirect location
		if (loginResponse.status === 302) {
			const location = loginResponse.headers.get('location');
			if (location && location.includes('wp-login.php')) {
				throw new Error('Login failed - redirected back to login page');
			}
		}

		// Verify authentication by checking a protected page
		const verifyResponse = await fetch(`${this.baseUrl}/wp-admin/admin-ajax.php`, {
			method: 'HEAD',
			headers: {
				'Cookie': this.sessionCookies.join('; ')
			}
		});

		if (!verifyResponse.ok) {
			throw new Error('Authentication verification failed');
		}
	}

	private async mapEventToFormData(event: ExternalEvent, userRecord: typeof user.$inferSelect): Promise<Record<string, string>> {
		const formData: Record<string, string> = {};

		// Basic event information
		formData['event_title'] = event.summary;
		if (event.description) {
			formData['event_description'] = event.description;
		}

		// Date and time
		if (event.startDate) {
			const startDate = new Date(event.startDate);
			formData['event_start_date'] = startDate.toISOString().split('T')[0]; // YYYY-MM-DD
		}

		if (event.startDateTime) {
			const startTime = event.startDateTime.toLocaleTimeString('de-DE', {
				hour: '2-digit',
				minute: '2-digit'
			});
			formData['event_start_time'] = startTime;
		}

		if (event.endDate) {
			const endDate = new Date(event.endDate);
			formData['event_end_date'] = endDate.toISOString().split('T')[0];
		}

		if (event.endDateTime) {
			const endTime = event.endDateTime.toLocaleTimeString('de-DE', {
				hour: '2-digit',
				minute: '2-digit'
			});
			formData['event_end_time'] = endTime;
		}

		// Location
		if (event.location) {
			formData['event_location'] = event.location;
		}

		// Contact information - resolve from contacts
		let targetContact = null;
		const eventId = event.metadata?.eventId;

		if (eventId) {
			// 1. Check if event has a contact
			const eventContacts = await getEntityContacts('event', eventId);
			if (eventContacts.length > 0) {
				targetContact = eventContacts[0];
			}

			// 2. Check if location has a contact
			if (!targetContact) {
				const resources = await db.query.eventResource.findMany({
					where: (er, { eq }) => eq(er.eventId, eventId),
					with: {
						resource: {
							with: {
								location: true
							}
						}
					}
				});

				for (const er of resources) {
					const locationId = (er.resource as any)?.locationId;
					if (locationId) {
						const locationContacts = await getEntityContacts('location', locationId);
						if (locationContacts.length > 0) {
							targetContact = locationContacts[0];
							break;
						}
					}
				}
			}
		}

		if (targetContact) {
			const contactName = targetContact.displayName || `${targetContact.givenName || ''} ${targetContact.familyName || ''}`.trim();
			const contactEmail = (targetContact as any).emails?.find((e: any) => e.primary)?.value || (targetContact as any).emails?.[0]?.value || '';
			const contactPhone = (targetContact as any).phones?.find((p: any) => p.primary)?.value || (targetContact as any).phones?.[0]?.value || '';

			formData['event_contact_name'] = contactName;
			formData['event_contact_email'] = contactEmail;
			if (contactPhone) {
				formData['event_contact_phone'] = contactPhone;
			}
		} else {
			// Default to user info if no contact found
			formData['event_contact_name'] = userRecord.name;
			formData['event_contact_email'] = userRecord.email;
		}

		// Category - map from metadata if available
		if (event.metadata?.category) {
			formData['event_category'] = event.metadata.category;
		}

		// Additional metadata
		if (event.metadata?.targetAudience) {
			formData['event_target_audience'] = event.metadata.targetAudience;
		}

		if (event.metadata?.registrationRequired) {
			formData['event_registration_required'] = '1';
		}

		return formData;
	}
}