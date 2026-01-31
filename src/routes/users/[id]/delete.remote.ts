import { command } from '$app/server';
import { db } from '$lib/server/db';
import { user } from '$lib/server/db/schema';
import { inArray } from 'drizzle-orm';
import { listUsers } from '../list.remote';
import { getAuthenticatedUser, ensureAccess } from '$lib/authorization';
import * as v from 'valibot';
import { error } from '@sveltejs/kit';

export const deleteUser = command(v.array(v.string()), async (userIds: string[]) => {
    const currentUser = getAuthenticatedUser();
    ensureAccess(currentUser, 'users');

    // Strict access control: only admin or self can delete
    const roles = currentUser.roles as string[] || [];
    if (!roles.includes('admin')) {
        // Non-admins can only delete themselves
        if (userIds.some(id => id !== currentUser.id)) {
            error(403, 'You do not have permission to delete other users');
        }
    }

    const result = await db.delete(user).where(inArray(user.id, userIds)).returning();

    await listUsers().refresh();

    return result;
});

