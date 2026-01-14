import { query } from '$app/server';
import { db } from '$lib/server/db';
import { campaign } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';
import type { Campaign } from '$lib/server/db/schema';
import { getAuthenticatedUser, ensureAccess } from '$lib/authorization';
import * as v from 'valibot';

/**
 * Query: Read a campaign by ID
 */
export const readCampaign = query(v.string(), async (campaignId: string): Promise<Campaign | null> => {
	const user = getAuthenticatedUser();
	ensureAccess(user, 'campaigns');

	const [result] = await db
		.select()
		.from(campaign)
		.where(eq(campaign.id, campaignId));
	return result || null;
});
