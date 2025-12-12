import { form } from '$app/server';
import { db } from '$lib/server/db';
import { campaign } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';
import type { Campaign } from '../list.remote';
import { readCampaign } from './read.remote';
import { listCampaigns } from '../list.remote';
import { getAuthenticatedUser, ensureAccess } from '$lib/authorization';
import { updateCampaignSchema } from '$lib/validations/campaign';

export const updateCampaign = form(updateCampaignSchema, async (data) => {
	try {
		const user = getAuthenticatedUser();
		ensureAccess(user, 'campaigns');

		// Get current campaign
		const current = await readCampaign(data.id);
		if (!current) {
			throw new Error('Campaign not found');
		}

		const name = data.name ?? current.name;
		const content = data.content ?
			(typeof data.content === 'string' ? JSON.parse(data.content) : data.content) :
			current.content;

		const result = await db
			.update(campaign)
			.set({
				name,
				content,
				updatedAt: new Date(),
			})
			.where(and(eq(campaign.id, data.id), eq(campaign.userId, user.id)))
			.returning();

		const updated = result[0];
		if (!updated) {
			throw new Error('Failed to update campaign');
		}

		const updatedCampaign: Campaign = updated;

		// Update both queries
		await readCampaign(data.id).set(updatedCampaign);
		await listCampaigns().refresh();

		return { updatedCampaign, campaign: updatedCampaign, success: true };
	} catch (error: any) {
		// Rethrow SvelteKit redirect errors
		if (error?.status && error?.location) throw error;
		// Rethrow other custom/fatal errors as needed
		throw error;
	}
});
