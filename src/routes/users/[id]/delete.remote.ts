import { command } from '$app/server';
import { db } from '$lib/server/db';
import { user } from '$lib/server/db/schema';
import { inArray } from 'drizzle-orm';
import { listUsers } from '../list.remote';
import { getAuthenticatedUser, parseRoles } from '$lib/authorization';
import { deleteUserIdsSchema } from '$lib/validations/user';

/**
 * Command: Delete one or more users
 */
export const deleteUsers = command(deleteUserIdsSchema, async (userIds: string[]) => {
    const currentUser = getAuthenticatedUser();
    // Check Admin
    const roles = parseRoles(currentUser);
    if (!roles.includes('admin')) {
        throw new Error('Forbidden: Admin access only');
    }

    if (userIds.length === 0) {
        throw new Error('No users to delete');
    }

    // Safety: Don't allow deleting self
    if (userIds.includes(currentUser.id)) {
        throw new Error('Cannot delete your own account via admin panel');
    }

    await db
        .delete(user)
        .where(inArray(user.id, userIds));

    // Refresh the list
    await listUsers().refresh();

    return { success: true, count: userIds.length };
});
