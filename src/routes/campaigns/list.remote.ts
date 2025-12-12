import { type InferSelectModel } from 'drizzle-orm';
import { query } from '$app/server';
import { campaign } from '$lib/server/db/schema';
import { listQuery } from '$lib/server/db/query-helpers';

export type Campaign = InferSelectModel<typeof campaign>;

/**
 * Query: List all campaigns for the current user
 */
export const listCampaigns = query(async (): Promise<Campaign[]> => {
	const results = await listQuery({
		table: campaign,
		featureName: 'campaigns',
		transform: (row) => ({
			...row,
		}),
	});
	return results;
});
