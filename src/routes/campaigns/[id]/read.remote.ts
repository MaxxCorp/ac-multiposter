import { z } from 'zod/mini';
import { query } from '$app/server';
import { campaign } from '$lib/server/db/schema';
import type { Campaign } from '../list.remote';
import { getQuery } from '$lib/server/db/query-helpers';

/**
 * Query: Get a single campaign by ID
*/

export const readCampaign = query(z.string(), async (campaignId: string): Promise<Campaign | null> => {

	if (campaignId === "") {
		return null;
	}

	const result = await getQuery({
		table: campaign,
		featureName: 'campaigns',
		id: campaignId,
		transform: (row) => ({
			...row,
		}),
	});

	return result;
});
