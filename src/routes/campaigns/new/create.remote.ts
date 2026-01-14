import * as v from 'valibot';
import { form } from '$app/server';
import { db } from '$lib/server/db';
import { campaign } from '$lib/server/db/schema';
import { listCampaigns } from '../list.remote';
import { getAuthenticatedUser, ensureAccess } from '$lib/authorization';
import { createCampaignSchema } from '$lib/validations/campaigns';

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
			.returning();

		const row = result[0];
		if (!row) {
			throw new Error('Failed to create campaign');
		}

		await listCampaigns().refresh();
		return { success: true };
	} catch (error: any) {
		if (error?.status && error?.location) {
			throw error
		}

		return {
			success: false,
			error: error?.message || 'An unexpected error occurred'
		};
	}
});