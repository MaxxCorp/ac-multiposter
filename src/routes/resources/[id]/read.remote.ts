import { z } from 'zod/mini';
import { query } from '$app/server';
import { db } from "$lib/server/db";
import { resource, resourceRelation } from "$lib/server/db/schema";
import { eq } from "drizzle-orm";
import { getQuery } from '$lib/server/db/query-helpers';

export const readResource = query(z.string(), async (id: string) => {
	const item = await getQuery({
		table: resource,
		featureName: 'resources',
		id,
	});

	if (!item) {
		return null;
	}

	// Get parent resources
	const parentRelations = await db
		.select()
		.from(resourceRelation)
		.where(eq(resourceRelation.childResourceId, id));

	return {
		...item,
		parentResourceIds: parentRelations.map(r => r.parentResourceId),
	};
});
