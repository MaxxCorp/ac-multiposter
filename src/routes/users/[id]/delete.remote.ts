import { command } from '$app/server';
import { db } from '$lib/server/db';
import { user } from '$lib/server/db/schema';
import { inArray } from 'drizzle-orm';
import { listUsers } from '../list.remote';
import { getAuthenticatedUser, ensureAccess } from '$lib/authorization';
import * as v from 'valibot';

export const deleteUser = command(v.array(v.string()), async (userIds: string[]) => {
    const currentUser = getAuthenticatedUser();
    ensureAccess(currentUser, 'users');

    const result = await db.delete(user).where(inArray(user.id, userIds)).returning();

    await listUsers().refresh();

    return result;
});

