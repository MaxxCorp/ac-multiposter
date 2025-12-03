import { form } from '$app/server';
import { db } from "$lib/server/db";
import { location } from "$lib/server/db/schema";
import { getAuthenticatedUser, ensureAccess } from "$lib/authorization";
import { createLocationSchema } from "$lib/validations/location";
import { listLocations } from '../list.remote';

export const createLocation = form(createLocationSchema, async (data) => {
    try {
        const user = getAuthenticatedUser();
        ensureAccess(user, 'locations');

        const result = await db.insert(location).values({
            id: crypto.randomUUID(),
            userId: user.id,
            name: data.name,
            address: data.address,
            roomId: data.roomId,
            latitude: data.latitude,
            longitude: data.longitude,
            what3words: data.what3words,
        }).returning();

        const row = result[0];
        if (!row) {
            throw new Error('Failed to create location');
        }

        await listLocations().refresh();
        return { success: true };
    } catch (error: any) {
        console.error('[createLocation] Error:', error);
        if (error?.status && error?.location) {
            throw error;
        }
        return {
            success: false,
            error: error?.message || 'An unexpected error occurred'
        };
    }
});
