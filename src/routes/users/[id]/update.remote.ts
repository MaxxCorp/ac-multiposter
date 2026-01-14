import { form } from '$app/server';
import { db } from '$lib/server/db';
import { user } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { listUsers } from '../list.remote';
import { readUser } from './read.remote';
import { getAuthenticatedUser, ensureAccess } from '$lib/authorization';
import { updateUserSchema } from '$lib/validations/users';

export const updateUser = form(updateUserSchema, async (data) => {
    const currentUser = getAuthenticatedUser();
    ensureAccess(currentUser, 'users');

    const result = await db.update(user)
        .set({
            name: data.name,
            email: data.email,
            roles: data.roles as any,
            claims: data.claims as any,
        })
        .where(eq(user.id, data.id))
        .returning();


    const updated = result[0];
    await readUser(data.id).refresh();
    await listUsers().refresh();

    return updated;
});
