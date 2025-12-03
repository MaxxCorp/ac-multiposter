import { form } from '$app/server';
import { db } from "$lib/server/db";
import { location } from "$lib/server/db/schema";
import { eq, and } from "drizzle-orm";
import { getAuthenticatedUser, ensureAccess } from "$lib/authorization";
import { updateLocationSchema } from "$lib/validations/location";
import { listLocations } from '../list.remote';
import { getLocation } from './get.remote';

export const updateLocation = form(updateLocationSchema, async (data) => {
    try {
        const user = getAuthenticatedUser();
        ensureAccess(user, 'locations');

        await db
            .update(location)
            .set({
                name: data.name,
                address: data.address,
                roomId: data.roomId,
                latitude: data.latitude,
                longitude: data.longitude,
                what3words: data.what3words,
                updatedAt: new Date(),
            })
            .where(and(eq(location.id, data.id), eq(location.userId, user.id)));

        await getLocation(data.id).refresh();
        await listLocations().refresh();
        return { success: true };
    } catch (error: any) {
        console.error('[updateLocation] Error:', error);
        if (error?.status && error?.location) {
            throw error;
        }
        return {
            success: false,
            error: error?.message || 'An unexpected error occurred'
        };
    }
});
