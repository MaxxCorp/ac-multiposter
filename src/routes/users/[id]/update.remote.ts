import { form } from '$app/server';
import { db } from '$lib/server/db';
import { user } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import type { User } from '../list.remote';
import { readUser } from './read.remote';
import { listUsers } from '../list.remote';
import { getAuthenticatedUser, parseRoles } from '$lib/authorization';
import { updateUserSchema } from '$lib/validations/user';

export const updateUser = form(updateUserSchema, async (data) => {
    try {
        const currentUser = getAuthenticatedUser();
        // Check strict admin access
        const roles = parseRoles(currentUser);
        if (!roles.includes('admin')) {
            throw new Error('Forbidden: Admin access required');
        }

        // Update user
        // Note: email change might need verification logic, but admin can forcefuly change it?
        // We'll allow it for now.
        const result = await db
            .update(user)
            .set({
                name: data.name,
                email: data.email,
                roles: (data.roles ?? []) as any,
                claims: data.claims ? JSON.parse(data.claims) : undefined,
                updatedAt: new Date(),
            })
            .where(eq(user.id, data.id))
            .returning();

        const updated = result[0];
        if (!updated) {
            throw new Error('Failed to update user');
        }

        const updatedUser: User = updated;

        // Update both queries
        await readUser(data.id).set(updatedUser);
        await listUsers().refresh();

        return { user: updatedUser, success: true };
    } catch (error: any) {
        // Rethrow SvelteKit redirect errors
        if (error?.status && error?.location) throw error;
        // Rethrow other custom/fatal errors as needed
        return {
            success: false,
            error: error?.message || 'An unexpected error occurred'
        };
    }
});
