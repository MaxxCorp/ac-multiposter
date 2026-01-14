import { query } from '$app/server';
import { db } from '$lib/server/db';
import { user } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import type { User } from '$lib/server/db/schema';
import { getAuthenticatedUser, ensureAccess } from '$lib/authorization';
import * as v from 'valibot';

/**
 * Query: Read a user by ID
 */
export const readUser = query(v.string(), async (userId: string): Promise<User | null> => {
    const currentUser = getAuthenticatedUser();
    ensureAccess(currentUser, 'users');

    const [result] = await db.select().from(user).where(eq(user.id, userId));
    return result || null;
});
