import type {
	SyncProvider,
	SyncConfig,
	ExternalEvent,
	ProviderType,
	SyncDirection
} from '../types';
import { db } from '$lib/server/db';
import { user, eventResource } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { resolveEventContact } from '$lib/server/contact-resolution';
import { env } from '$env/dynamic/private';

/**
 * Berlin.de Main Calendar sync provider implementation
 * Pushes events to the Berlin.de event submission form
 */
export class BerlinDeMainCalendarProvider implements SyncProvider {
	readonly type: ProviderType = 'berlin-de-main-calendar';
	readonly name = 'Berlin.de (Main Calendar)';
	readonly supportsWebhooks = false;
	readonly supportedDirections: SyncDirection[] = ['push'];
	readonly supportedEntityTypes: ('event' | 'announcement')[] = ['event'];


	private config?: SyncConfig;
	private formUrl = 'https://www.berlin.de/tickets/6226271-2789889-datenerfassung.html';
	private fieldMappings: Record<string, string> = {
		'titel': 'summary',
		'beschreibung': 'description',
		'veranstaltungsort': 'location',
		'strasse': 'street',
		'hausnummer': 'houseNumber',
		'plz': 'zip',
		'ort': 'city',
		'gewünschte_kategorie': 'categoryBerlinDotDe',
		'termin': 'startDate',
		'uhrzeit': 'startTime',
		'weitere_termine': 'additionalDates',
		'eintrittspreis': 'ticketPrice',
		'barrierefreiheit': 'inclusivitySupport',
		'firma': 'company',
		'name': 'userName',
		'email': 'userEmail',
		'telefon': 'userPhone'
	};

	async initialize(config: SyncConfig): Promise<void> {
		this.config = config;

		// Set form URL based on environment

		const isDevelopment = env.NODE_ENV === 'development' || !env.NODE_ENV;
		if (isDevelopment) {
			// In development, use internal testing endpoint
			this.formUrl = 'http://localhost:5173/testing/api/berlin-de';
		} else {
			// In production, use Berlin.de
			this.formUrl = 'https://www.berlin.de/tickets/6226271-2789889-datenerfassung.html';
		}

		// Override form URL if specified in settings
		if (config.settings?.formUrl) {
			this.formUrl = config.settings.formUrl;
		}

		// Override default mappings if specified in settings
		if (config.settings?.fieldMappings) {
			this.fieldMappings = { ...this.fieldMappings, ...config.settings.fieldMappings };
		}
	}

	async validateConnection(): Promise<boolean> {
		// For push-only providers, we can validate by checking if we can access the form
		// But since it's a simple form POST, we'll just return true for now
		// In a real implementation, you might want to fetch the form and check if it's accessible
		return true;
	}

	async pullEvents(): Promise<{
		events: ExternalEvent[];
		nextSyncToken?: string;
	}> {
		// Push-only provider doesn't support pulling
		throw new Error('Berlin.de provider only supports push operations');
	}

	async pushEvent(event: ExternalEvent): Promise<{ externalId: string; etag?: string }> {
		if (!this.config) {
			throw new Error('Provider not initialized');
		}

		// Fetch user details for contact info
		const [userRecord] = await db
			.select()
			.from(user)
			.where(eq(user.id, this.config.userId))
			.limit(1);

		if (!userRecord) {
			throw new Error('User not found');
		}

		// Prepare form data
		const formData = await this.mapEventToFormData(event, userRecord);

		// Add event ID for testing purposes
		formData.eventId = event.externalId || event.providerId;

		// Submit to Berlin.de form
		const response = await fetch(this.formUrl, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/x-www-form-urlencoded',
				'User-Agent': 'Mozilla/5.0 (compatible; EventSync/1.0)'
			},
			body: new URLSearchParams(formData).toString()
		});

		if (!response.ok) {
			throw new Error(`Failed to submit to Berlin.de: ${response.status} ${response.statusText}`);
		}

		// Berlin.de doesn't return an external ID, so we'll generate one
		const externalId = `berlin-de-${event.externalId || crypto.randomUUID()}`;

		return {
			externalId,
			etag: undefined // Berlin.de doesn't provide etags
		};
	}

	async updateEvent(externalId: string, event: ExternalEvent): Promise<{ etag?: string }> {
		// Berlin.de form doesn't support updates, only new submissions
		// We'll treat updates as new submissions
		return this.pushEvent(event);
	}

	async deleteEvent(externalId: string): Promise<void> {
		// Berlin.de doesn't support deletions through the form
		// This is a no-op for push-only providers
		console.warn(`Berlin.de provider doesn't support event deletion for ${externalId}`);
	}

	private async mapEventToFormData(event: ExternalEvent, userRecord: typeof user.$inferSelect): Promise<Record<string, string>> {
		const formData: Record<string, string> = {};

		// Map basic fields
		formData[this.fieldMappings.titel] = event.summary;
		if (event.description) {
			formData[this.fieldMappings.beschreibung] = event.description;
		}
		if (event.location) {
			formData[this.fieldMappings.veranstaltungsort] = event.location;
		}

		// Parse location for address components if available
		// This would require additional logic to split location into street, house number, etc.

		// Category
		if (event.metadata?.categoryBerlinDotDe) {
			formData[this.fieldMappings.gewünschte_kategorie] = event.metadata.categoryBerlinDotDe;
		}

		// Date and time
		if (event.startDateTime) {
			// Convert YYYY-MM-DD to MM/DD/YYYY for Berlin.de
			const date = new Date(event.startDateTime);
			const mm = String(date.getMonth() + 1).padStart(2, '0');
			const dd = String(date.getDate()).padStart(2, '0');
			const yyyy = date.getFullYear();
			formData[this.fieldMappings.termin] = `${mm}/${dd}/${yyyy}`;
		}

		if (event.startDateTime) {
			const time = event.startDateTime.toLocaleTimeString('de-DE', {
				hour: '2-digit',
				minute: '2-digit'
			});
			formData[this.fieldMappings.uhrzeit] = time;
		}

		// Additional dates (for multi-day or recurring events)
		if (event.endDateTime && event.startDateTime && event.endDateTime.toISOString().split('T')[0] !== event.startDateTime.toISOString().split('T')[0]) {
			const endDate = new Date(event.endDateTime);
			const additionalInfo = `bis ${endDate.toLocaleDateString('de-DE')}`;
			if (event.recurrence && event.recurrence.length > 0) {
				formData[this.fieldMappings.weitere_termine] = `${additionalInfo}, wiederholend`;
			} else {
				formData[this.fieldMappings.weitere_termine] = additionalInfo;
			}
		} else if (event.recurrence && event.recurrence.length > 0) {
			formData[this.fieldMappings.weitere_termine] = 'Wiederholendes Event';
		}

		// Ticket price
		if (event.metadata?.ticketPrice) {
			formData[this.fieldMappings.eintrittspreis] = event.metadata.ticketPrice;
		}

		// Contact info resolution using shared algorithm
		const resolvedContact = await resolveEventContact(event);

		if (resolvedContact) {
			formData[this.fieldMappings.name] = resolvedContact.name;
			formData[this.fieldMappings.email] = resolvedContact.email;
			if (resolvedContact.phone) {
				formData[this.fieldMappings.telefon] = resolvedContact.phone;
			}
		} else {
			// Default to user info if no contact found
			formData[this.fieldMappings.name] = userRecord.name;
			formData[this.fieldMappings.email] = userRecord.email;
		}

		// Company from settings
		if (this.config?.settings?.company) {
			formData[this.fieldMappings.firma] = this.config.settings.company;
		}

		return formData;
	}
}