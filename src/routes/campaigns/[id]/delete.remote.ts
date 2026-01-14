import { command } from '$app/server';
import { error } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { eq, inArray } from 'drizzle-orm';
import { campaign } from '$lib/server/db/schema';
import { getAuthenticatedUser, ensureAccess } from '$lib/authorization';
import { listCampaigns } from '../list.remote';
import { deleteCampaignSchema } from '$lib/validations/campaigns';

/**
 * Command: Delete one or more campaigns
 */

export const deleteCampaigns = command(deleteCampaignSchema, async (campaignIds: string[]) => {
	const user = getAuthenticatedUser();
	ensureAccess(user, 'campaigns');

	try {
		await db
			.delete(campaign)
			.where(inArray(campaign.id, campaignIds));
	} catch (thrownError: any) {
		console.error('Error deleting campaigns:', thrownError);
		error(500, 'Error deleting campaigns');
	}

	// Refresh the list
	await listCampaigns().refresh();

	return { success: true, count: campaignIds.length };
});
