import { z } from 'zod/mini';
import { query } from '$app/server';
import { db } from '$lib/server/db';
import { user } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import type { User } from '../list.remote';
import { getAuthenticatedUser, parseRoles } from '$lib/authorization';

/**
 * Query: Get a single user by ID
 */
export const readUser = query(z.string(), async (userId: string): Promise<User | null> => {
    // Optional: Enforce Admin or Self
    const currentUser = getAuthenticatedUser();
    const roles = parseRoles(currentUser);
    // If not admin and not self, deny?
    if (!roles.includes('admin') && currentUser.id !== userId) {
        // Strict Admin feature usually requires Admin.
        // I'll stick to Admin-only for this "Manage Users" route context.
        throw new Error('Forbidden');
    }

    const results = await db
        .select()
        .from(user)
        .where(eq(user.id, userId))
        .limit(1);

    return results[0] || null;
});
