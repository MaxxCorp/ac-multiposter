import { query } from '$app/server';
import { db } from '$lib/server/db';
import { location } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';
import { getAuthenticatedUser, ensureAccess } from '$lib/authorization';
import * as v from 'valibot';

export const readLocation = query(v.string(), async (id: string) => {
	const user = getAuthenticatedUser();
	ensureAccess(user, 'locations');

	const [result] = await db
		.select()
		.from(location)
		.where(eq(location.id, id));
	return result || null;
});
