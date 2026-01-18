import type {
	SyncProvider,
	SyncConfig,
	ExternalEvent,
	ProviderType,
	SyncDirection,
	WebhookSubscription
} from '../types';
import { getAuthenticatedUser } from '$lib/authorization';
import { getEntityContacts } from '../../contacts';
import { resolveEventContact } from '../../contact-resolution';
import { db } from '../../db';
import { user } from '../../db/schema';
import { emailCampaign, emailEvent } from '../../db/schema';
import { renderEmailTemplates, type EmailTemplateData } from '../../email-templates';
import { env } from '$env/dynamic/private';
import fs from 'fs';
import path from 'path';

/**
 * Brevo email sync provider implementation
 * Sends rich HTML emails with event details, QR codes, iCal, and vCard attachments
 * Supports webhook tracking of email events (delivered, opened, clicked, etc.)
 */
export class EmailProvider implements SyncProvider {
	readonly type: ProviderType = 'email';
	readonly name = 'E-Mail (Brevo)';
	readonly supportsWebhooks = true;
	readonly supportedDirections: SyncDirection[] = ['push'];
	readonly supportedEntityTypes: ('event' | 'announcement')[] = ['event', 'announcement'];


	private config?: SyncConfig;
	private brevoApiKey?: string;
	private brevoBaseUrl = 'https://api.brevo.com/v3';

	async initialize(config: SyncConfig): Promise<void> {
		this.config = config;

		// Get Brevo API key from environment
		this.brevoApiKey = env.BREVO_API_KEY;
		if (!this.brevoApiKey) {
			throw new Error('BREVO_API_KEY environment variable is required for email provider');
		}

		// Validate API key by making a test request
		try {
			await this.makeBrevoRequest('GET', '/account');
		} catch (error) {
			throw new Error(`Failed to validate Brevo API key: ${error}`);
		}
	}

	async validateConnection(): Promise<boolean> {
		if (!this.brevoApiKey) {
			return false;
		}

		try {
			await this.makeBrevoRequest('GET', '/account');
			return true;
		} catch {
			return false;
		}
	}

	async pullEvents(syncToken?: string): Promise<{
		events: ExternalEvent[];
		nextSyncToken?: string;
	}> {
		// Email provider is push-only
		throw new Error('Email provider only supports push operations');
	}

	async pushEvent(event: ExternalEvent): Promise<{ externalId: string; etag?: string }> {
		if (!this.config || !this.brevoApiKey) {
			throw new Error('Provider not initialized');
		}

		// Get user record for sender info
		const user = getAuthenticatedUser();
		const userRecord = await db.query.user.findFirst({
			where: (u, { eq }) => eq(u.id, user.id)
		});

		if (!userRecord) {
			throw new Error('User record not found');
		}

		// Get recipient email from config
		const recipientEmail = this.config.settings?.recipientEmail;
		if (!recipientEmail) {
			throw new Error('Email provider requires recipientEmail in sync config settings');
		}

		// Generate email content and attachments
		const emailContent = await this.generateEmailContent(event, userRecord);
		const attachments = await this.generateAttachments(event, userRecord);

		// Get recipient contacts
		const recipients = await this.getRecipients(event);

		// Create Brevo campaign
		const campaignData = {
			name: `Event: ${event.summary}`,
			subject: `Neue Veranstaltung: ${event.summary}`,
			sender: {
				name: userRecord.name,
				email: userRecord.email
			},
			htmlContent: emailContent.html,
			textContent: emailContent.text,
			recipients: recipients.map(r => ({ email: r.email })),
			attachment: attachments,
			// Enable tracking
			tracking: {
				opens: true,
				clicks: true,
				unsubscriptions: true
			}
		};

		try {
			const campaignResponse = await this.makeBrevoRequest('POST', '/emailCampaigns', campaignData);
			const brevoCampaignId = campaignResponse.id;

			// Send the campaign immediately
			await this.makeBrevoRequest('POST', `/emailCampaigns/${brevoCampaignId}/sendNow`);

			const isAnnouncement = event.metadata?.entityType === 'announcement';

			// Store campaign in database
			await db.insert(emailCampaign).values({
				syncConfigId: this.config.id,
				eventId: isAnnouncement ? undefined : (event.metadata?.eventId || event.externalId),
				announcementId: isAnnouncement ? (event.metadata?.announcementId || event.externalId) : undefined,
				eventSummary: event.summary,
				brevoCampaignId: brevoCampaignId.toString(),
				sentAt: new Date(),
				recipientCount: recipients.length,
				metadata: {
					brevoCampaignId,
					recipients: recipients.map(r => r.email)
				}
			});

			// Generate external ID for tracking
			const externalId = `email-${event.externalId || crypto.randomUUID()}-${Date.now()}`;

			return {
				externalId,
				etag: new Date().toISOString()
			};
		} catch (error) {
			console.error('[EmailProvider] Failed to send email via Brevo:', error);
			throw new Error(`Failed to send email: ${error}`);
		}
	}

	async updateEvent(externalId: string, event: ExternalEvent): Promise<{ etag?: string }> {
		// For updates, send a new email with update notification
		return this.pushEvent(event);
	}

	async deleteEvent(externalId: string): Promise<void> {
		// Email provider doesn't support deletions
		console.warn(`Email provider doesn't support event deletion for ${externalId}`);
	}

	async setupWebhook(callbackUrl: string): Promise<WebhookSubscription> {
		if (!this.config) {
			throw new Error('Provider not initialized');
		}

		// Brevo webhooks are configured at the account level, not per campaign
		// We'll create a webhook for email events if it doesn't exist
		const webhookData = {
			type: 'marketing',
			events: ['delivered', 'opened', 'click', 'hardBounce', 'softBounce', 'spam', 'unsubscribed'],
			url: callbackUrl,
			description: `Webhook for sync config ${this.config.id}`
		};

		try {
			const response = await this.makeBrevoRequest('POST', '/webhooks', webhookData);

			return {
				syncConfigId: this.config.id,
				providerId: this.config.providerId,
				resourceId: response.id.toString(),
				channelId: response.id.toString(),
				expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // Brevo webhooks don't expire
				createdAt: new Date()
			} as WebhookSubscription;
		} catch (error) {
			console.error('[EmailProvider] Failed to setup Brevo webhook:', error);
			throw new Error(`Failed to setup webhook: ${error}`);
		}
	}

	async renewWebhook(subscription: WebhookSubscription): Promise<WebhookSubscription> {
		// Brevo webhooks don't expire, so just return the existing one
		return subscription;
	}

	async cancelWebhook(subscription: WebhookSubscription): Promise<void> {
		try {
			await this.makeBrevoRequest('DELETE', `/webhooks/${subscription.resourceId}`);
		} catch (error) {
			console.error('[EmailProvider] Failed to cancel Brevo webhook:', error);
			// Don't throw - webhook may have already been deleted
		}
	}

	async processWebhook(payload: any): Promise<{
		changes: Array<{ externalId: string; changeType: 'created' | 'updated' | 'deleted' }>;
	}> {
		// Process Brevo webhook events
		const events = Array.isArray(payload) ? payload : [payload];

		for (const event of events) {
			try {
				// Find the campaign by Brevo campaign ID
				const campaign = await db.query.emailCampaign.findFirst({
					where: (c, { eq }) => eq(c.brevoCampaignId, event.campaignId?.toString())
				});

				if (campaign) {
					// Store the email event
					await db.insert(emailEvent).values({
						emailCampaignId: campaign.id,
						recipientEmail: event.email,
						eventType: event.event,
						eventData: event,
						occurredAt: new Date(event.date)
					});
				}
			} catch (error) {
				console.error('[EmailProvider] Failed to process webhook event:', error);
			}
		}

		// Return empty changes since email events don't affect the event itself
		return { changes: [] };
	}

	private async makeBrevoRequest(method: string, endpoint: string, data?: any): Promise<any> {
		const url = `${this.brevoBaseUrl}${endpoint}`;

		const response = await fetch(url, {
			method,
			headers: {
				'Content-Type': 'application/json',
				'api-key': this.brevoApiKey!
			},
			body: data ? JSON.stringify(data) : undefined
		});

		if (!response.ok) {
			const errorText = await response.text();
			throw new Error(`Brevo API error ${response.status}: ${errorText}`);
		}

		return response.json();
	}

	private async getRecipients(event: ExternalEvent): Promise<Array<{ email: string; name?: string }>> {
		const recipients: Array<{ email: string; name?: string }> = [];

		// Add configured recipient
		const recipientEmail = this.config!.settings?.recipientEmail;
		if (recipientEmail) {
			recipients.push({ email: recipientEmail });
		}

		// Add event contacts
		const eventId = event.metadata?.eventId;
		const announcementId = event.metadata?.announcementId;
		const entityId = eventId || announcementId;
		const entityType = eventId ? 'event' : 'announcement';

		if (entityId) {
			const contacts = await getEntityContacts(entityType, entityId);
			for (const contact of contacts) {
				const email = (contact as any).emails?.find((e: any) => e.primary)?.value ||
					(contact as any).emails?.[0]?.value;
				if (email && !recipients.find(r => r.email === email)) {
					recipients.push({
						email,
						name: contact.displayName || `${contact.givenName || ''} ${contact.familyName || ''}`.trim()
					});
				}
			}
		}

		return recipients;
	}

	private async generateEmailContent(event: ExternalEvent, userRecord: typeof user.$inferSelect): Promise<{ html: string; text: string }> {
		// Get contact information using shared algorithm
		const resolvedContact = await resolveEventContact(event);
		let contactInfo = {
			name: userRecord.name,
			email: userRecord.email,
			phone: ''
		};

		if (resolvedContact) {
			contactInfo = resolvedContact;
		}

		const templateData: EmailTemplateData = {
			event: {
				summary: event.summary,
				description: event.description,
				startDate: event.startDate,
				startDateTime: event.startDateTime,
				endDate: event.endDate,
				endDateTime: event.endDateTime,
				location: event.location,
				recurrence: event.recurrence
			},
			contactInfo
		};

		if (event.metadata?.entityType === 'announcement') {
			templateData.isAnnouncement = true;
		}

		return await renderEmailTemplates(templateData);
	}

	private async generateAttachments(event: ExternalEvent, userRecord: typeof user.$inferSelect): Promise<any[]> {
		const attachments: any[] = [];
		const isAnnouncement = event.metadata?.entityType === 'announcement';

		if (isAnnouncement) return attachments; // Announcements don't have iCal/QR assets (yet)

		const eventId = event.metadata?.eventId;

		if (!eventId) {
			console.warn('[EmailProvider] No eventId in metadata, cannot attach static files');
			return attachments;
		}

		// Attach existing iCal file
		try {
			const icalPath = path.join(process.cwd(), 'static', 'events', `${eventId}.ics`);
			if (fs.existsSync(icalPath)) {
				const icalContent = fs.readFileSync(icalPath);
				attachments.push({
					name: 'event.ics',
					content: icalContent.toString('base64')
				});
			}
		} catch (error) {
			console.warn('[EmailProvider] Failed to attach iCal file:', error);
		}

		// Attach existing QR code file
		try {
			const qrPath = path.join(process.cwd(), 'static', 'events', `${eventId}.png`);
			if (fs.existsSync(qrPath)) {
				const qrContent = fs.readFileSync(qrPath);
				attachments.push({
					name: 'event-qr-code.png',
					content: qrContent.toString('base64')
				});
			}
		} catch (error) {
			console.warn('[EmailProvider] Failed to attach QR code file:', error);
		}

		// Attach vCard if we have contact information
		// For now, we'll skip vCard attachment as we don't have a direct contact ID mapping
		// This could be added later if needed

		return attachments;
	}
}