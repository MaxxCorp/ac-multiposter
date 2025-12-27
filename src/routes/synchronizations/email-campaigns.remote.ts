import { query } from '$app/server';
import { emailCampaign, emailEvent } from '$lib/server/db/schema';
import { eq, desc, and } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { getAuthenticatedUser } from '$lib/authorization';
import { ensureAccess } from '$lib/authorization';
import { GetEmailCampaignsSchema } from '$lib/validations/sync';

export const getEmailCampaigns = query(GetEmailCampaignsSchema, async ({ syncConfigId, limit = 10, offset = 0 }) => {
	const user = getAuthenticatedUser();
	ensureAccess(user, 'synchronizations');

	const campaigns = await db
		.select({
			id: emailCampaign.id,
			eventSummary: emailCampaign.eventSummary,
			sentAt: emailCampaign.sentAt,
			recipientCount: emailCampaign.recipientCount,
			brevoCampaignId: emailCampaign.brevoCampaignId,
		})
		.from(emailCampaign)
		.where(eq(emailCampaign.syncConfigId, syncConfigId))
		.orderBy(desc(emailCampaign.sentAt))
		.limit(limit)
		.offset(offset);

	// For each campaign, get the latest event for each recipient
	const campaignsWithEvents = await Promise.all(
		campaigns.map(async (campaign) => {
			const events = await db
				.select({
					recipientEmail: emailEvent.recipientEmail,
					eventType: emailEvent.eventType,
					occurredAt: emailEvent.occurredAt,
				})
				.from(emailEvent)
				.where(eq(emailEvent.emailCampaignId, campaign.id))
				.orderBy(desc(emailEvent.occurredAt));

			// Group events by recipient and keep only the latest event per recipient
			const recipientEvents = new Map<string, typeof events[0]>();
			for (const event of events) {
				if (!recipientEvents.has(event.recipientEmail)) {
					recipientEvents.set(event.recipientEmail, event);
				}
			}

			return {
				...campaign,
				events: Array.from(recipientEvents.values()),
			};
		})
	);

	return campaignsWithEvents;
});