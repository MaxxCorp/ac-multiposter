import { form } from '$app/server';
import { db } from '$lib/server/db';
import { user } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { listUsers } from '../list.remote';
import { readUser } from './read.remote';
import { getAuthenticatedUser, ensureAccess } from '$lib/authorization';
import { updateUserSchema } from '$lib/validations/users';
import { error } from '@sveltejs/kit';

export const updateUser = form(updateUserSchema, async (data) => {
    console.log('--- updateUser START ---');
    console.log('Data received:', JSON.stringify(data, null, 2));

    try {
        const currentUser = getAuthenticatedUser();
        ensureAccess(currentUser, 'users');
        console.log('User authenticated:', currentUser.id);

        // Strict access control: only admin or self can update
        const roles = currentUser.roles as string[] || [];
        if (!roles.includes('admin') && currentUser.id !== data.id) {
            error(403, 'You do not have permission to update this user');
        }

        const updateData: any = {
            name: data.name,
            email: data.email,
            roles: data.roles as any,
            claims: data.claims as any,
        };

        console.log('Update payload:', updateData);

        const result = await db.update(user)
            .set(updateData)
            .where(eq(user.id, data.id))
            .returning();

        if (result.length === 0) {
            console.error('No rows updated.');
            return { success: false, error: { message: 'User not found or update failed' } };
        }

        const updated = result[0];

        // Refresh lists/reads
        await readUser(data.id).refresh();
        await listUsers().refresh();

        console.log('--- updateUser SUCCESS ---');
        return { success: true, user: updated };
    } catch (err: any) {
        console.error('--- updateUser ERROR ---', err);
        return { success: false, error: { message: err.message || 'Update failed' } };
    }
});
