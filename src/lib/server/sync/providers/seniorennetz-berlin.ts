import type {
	SyncProvider,
	SyncConfig,
	ExternalEvent,
	ProviderType,
	SyncDirection
} from '../types';
import { env } from '$env/dynamic/private';

/**
 * Seniorennetz.Berlin sync provider implementation
 * Push-only provider for submitting events to Seniorennetz.Berlin for review
 */
export class SeniorennetzBerlinProvider implements SyncProvider {
	readonly type: ProviderType = 'seniorennetz-berlin';
	readonly name = 'Seniorennetz.Berlin';
	readonly supportsWebhooks = false; // Web form submission doesn't support webhooks
	readonly supportedDirections: SyncDirection[] = ['push'];
	readonly supportedEntityTypes: ('event' | 'announcement')[] = ['event'];


	private config?: SyncConfig;

	async initialize(config: SyncConfig): Promise<void> {
		this.config = config;
	}

	async validateConnection(): Promise<boolean> {
		// For web form submission, we can't really validate connection
		// We'll assume it's always valid since it's just posting to a public form
		return true;
	}

	async pullEvents(syncToken?: string): Promise<{
		events: ExternalEvent[];
		nextSyncToken?: string;
	}> {
		// Seniorennetz.Berlin provider is push-only, so we don't implement pull
		throw new Error('Seniorennetz.Berlin provider does not support pulling events');
	}

	async pushEvent(event: ExternalEvent): Promise<{ externalId: string; etag?: string }> {
		const formData = this.mapToFormData(event);

		const response = await fetch('https://seniorennetz.berlin/de/eintragvorschlagen?service', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/x-www-form-urlencoded',
				'User-Agent': 'AC-Multiposter/1.0'
			},
			body: new URLSearchParams(formData).toString()
		});

		if (!response.ok) {
			const errorText = await response.text().catch(() => 'Unknown error');
			console.error('[SeniorennetzBerlinProvider] Failed to submit event:', {
				status: response.status,
				statusText: response.statusText,
				error: errorText
			});
			throw new Error(`Failed to submit event to Seniorennetz.Berlin: ${response.status} ${response.statusText}`);
		}

		// Since this is a form submission for review, we don't get an external ID back
		// We'll generate a unique ID based on the event data for tracking purposes
		const externalId = this.generateExternalId(event);

		return {
			externalId,
			etag: new Date().toISOString()
		};
	}

	async updateEvent(externalId: string, event: ExternalEvent): Promise<{ etag?: string }> {
		// For updates, we need to submit the form again with updated information
		// Since the form doesn't support updates directly, we'll submit as a new entry
		// with a note that it's an update
		const formData = this.mapToFormData(event, true); // true indicates this is an update

		const response = await fetch('https://seniorennetz.berlin/de/eintragvorschlagen?service', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/x-www-form-urlencoded',
				'User-Agent': 'AC-Multiposter/1.0'
			},
			body: new URLSearchParams(formData).toString()
		});

		if (!response.ok) {
			const errorText = await response.text().catch(() => 'Unknown error');
			console.error('[SeniorennetzBerlinProvider] Failed to update event:', {
				externalId,
				status: response.status,
				statusText: response.statusText,
				error: errorText
			});
			throw new Error(`Failed to update event on Seniorennetz.Berlin: ${response.status} ${response.statusText}`);
		}

		return {
			etag: new Date().toISOString()
		};
	}

	async deleteEvent(externalId: string): Promise<void> {
		// Deletions are handled via email according to the requirements
		// For now, we'll throw an error indicating this needs to be done manually
		throw new Error('Event deletion on Seniorennetz.Berlin must be done via email. Please contact the website operators directly.');
	}

	// Webhook methods not implemented for form submission provider
	setupWebhook?(): Promise<any> {
		throw new Error('Seniorennetz.Berlin provider does not support webhooks');
	}

	renewWebhook?(): Promise<any> {
		throw new Error('Seniorennetz.Berlin provider does not support webhooks');
	}

	cancelWebhook?(): Promise<any> {
		throw new Error('Seniorennetz.Berlin provider does not support webhooks');
	}

	processWebhook?(): Promise<any> {
		throw new Error('Seniorennetz.Berlin provider does not support webhooks');
	}

	private mapToFormData(event: ExternalEvent, isUpdate: boolean = false): Record<string, string> {
		const formData: Record<string, string> = {};

		// Basic event information
		formData['title'] = event.summary;
		formData['description'] = event.description || event.summary;

		// Date and time handling
		if (event.startDateTime) {
			const startDate = event.startDateTime.toISOString().split('T')[0]; // YYYY-MM-DD
			const startTime = event.startDateTime.toTimeString().substring(0, 5); // HH:MM
			formData['start_date'] = startDate;
			formData['start_time'] = startTime;
		} else if (event.startDate) {
			formData['start_date'] = event.startDate;
			formData['start_time'] = '00:00'; // Default to start of day for all-day events
		}

		if (event.endDateTime) {
			const endTime = event.endDateTime.toTimeString().substring(0, 5); // HH:MM
			formData['end_time'] = endTime;
		} else if (event.endDate) {
			formData['end_time'] = '23:59'; // Default to end of day for all-day events
		}

		// Location
		if (event.location) {
			formData['location'] = event.location;
		}

		// Contact information from config or defaults
		if (this.config?.settings?.contactName) {
			formData['contact_name'] = this.config.settings.contactName;
		}
		if (this.config?.settings?.contactEmail) {
			formData['contact_email'] = this.config.settings.contactEmail;
		}
		if (this.config?.settings?.contactPhone) {
			formData['contact_phone'] = this.config.settings.contactPhone;
		}

		// Organization information
		if (this.config?.settings?.organization) {
			formData['organization'] = this.config.settings.organization;
		}

		// Event category/type
		if (this.config?.settings?.category) {
			formData['category'] = this.config.settings.category;
		} else {
			formData['category'] = 'Veranstaltung'; // Default to "Event" in German
		}

		// Target audience (senior citizens focused)
		formData['target_audience'] = 'senioren'; // "seniors" in German

		// Add update note if this is an update
		if (isUpdate) {
			formData['description'] += '\n\n[UPDATE] This is an updated version of a previously submitted event.';
		}

		// Add submission metadata
		formData['submitted_by'] = 'AC-Multiposter';
		formData['submission_date'] = new Date().toISOString();

		return formData;
	}

	private generateExternalId(event: ExternalEvent): string {
		// Generate a unique ID based on event data for tracking purposes
		// Since the form doesn't return an ID, we create one for internal tracking
		const timestamp = Date.now();
		const titleHash = event.summary.slice(0, 10).replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
		return `seniorennetz-${timestamp}-${titleHash}`;
	}
}