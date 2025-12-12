import { type InferSelectModel } from 'drizzle-orm';
import { query } from '$app/server';
import { db } from '$lib/server/db';
import { user } from '$lib/server/db/schema';
import { ensureAccess, getAuthenticatedUser, parseRoles } from '$lib/authorization';
import { desc } from 'drizzle-orm';

export type User = InferSelectModel<typeof user>;

/**
 * Query: List all users (Admin only)
 */
export const listUsers = query(async (): Promise<User[]> => {
    const currentUser = getAuthenticatedUser();
    const roles = parseRoles(currentUser);
    if (!roles.includes('admin')) {
        throw new Error('Forbidden: Admin access only');
    }

    // Direct DB query, bypassing listQuery helper which enforces owner checks
    const results = await db
        .select()
        .from(user)
        .orderBy(desc(user.createdAt));

    return results;
});
