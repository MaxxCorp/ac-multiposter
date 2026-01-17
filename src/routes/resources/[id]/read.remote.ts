import { query } from '$app/server';
import { db } from '$lib/server/db';
import { resource } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';
import { getAuthenticatedUser, ensureAccess } from '$lib/authorization';
import * as v from 'valibot';

import { resourceRelation } from '$lib/server/db/schema';

export const readResource = query(v.string(), async (id: string) => {
	const user = getAuthenticatedUser();
	ensureAccess(user, 'resources');

	const [result] = await db
		.select()
		.from(resource)
		.where(eq(resource.id, id));

	if (!result) return null;

	// Fetch parent relations
	const relations = await db
		.select({ parentId: resourceRelation.parentResourceId })
		.from(resourceRelation)
		.where(eq(resourceRelation.childResourceId, id));

	return {
		...result,
		parentResourceIds: relations.map(r => r.parentId)
	};
});
