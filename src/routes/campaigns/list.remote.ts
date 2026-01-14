import { query } from '$app/server';
import { campaign } from '$lib/server/db/schema/campaigns';
import { type Campaign } from '$lib/server/db/schema/campaigns';
export type { Campaign };
import { listQuery } from '$lib/server/db/query-helpers';


/**
 * Query: List all campaigns
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
