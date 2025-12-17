import { z } from 'zod/mini';
import { query } from '$app/server';
import { location } from '$lib/server/db/schema';
import { getQuery } from '$lib/server/db/query-helpers';

export const readLocation = query(z.string(), async (id: string) => {
	const result = await getQuery({
		table: location,
		featureName: 'locations',
		id,
	});

	return result;
});
