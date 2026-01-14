import { query } from '$app/server';
import { syncConfig } from '$lib/server/db/schema';
import { listQuery } from '$lib/server/db/query-helpers';

/**
 * List all sync configurations for the current user
 */
export const list = query(async () => {
	const configs = await listQuery({
		table: syncConfig,
		featureName: 'synchronizations',
	});

	return configs;
});
