
import { form } from '$app/server';
import { db } from '$lib/server/db';
import { campaign } from '$lib/server/db/schema';
import { listCampaigns, type Campaign } from '../list.remote';
import { getAuthenticatedUser, ensureAccess } from '$lib/authorization';
import { createCampaignSchema } from '$lib/validations/campaign';

export const createCampaign = form(createCampaignSchema, async (data) => {
	try {
		const user = getAuthenticatedUser();
		ensureAccess(user, 'campaigns');

		const result = await db
			.insert(campaign)
			.values({
				userId: user.id,
				name: data.name,
				content: typeof data.content === 'string' ? JSON.parse(data.content) : data.content,
			})
			.returning({ id: campaign.id });

		const row = result[0];
		if (!row) {
			throw new Error('Failed to create campaign');
			// return { error: { message: 'Failed to create campaign' } };
		}


		await listCampaigns().refresh();
		return { success: true };
	} catch (error: any) {
		// Check if this is a redirect error being thrown by SvelteKit
		// If so, re-throw it so SvelteKit can handle the redirect
		if (error?.status && error?.location) {
			throw error

		}

		// Otherwise it's a real error, return it
		return {
			success: false,
			error: error?.message || 'An unexpected error occurred'
		};
	}
});