import { form } from '$app/server';
import { db } from '$lib/server/db';
import { kiosk, kioskLocation } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';
import { getAuthenticatedUser, ensureAccess } from '$lib/authorization';
import { updateKioskSchema } from '$lib/validations/kiosks';
import { getKiosk } from './read.remote';
import { listKiosks } from '../list.remote';
import { error } from '@sveltejs/kit';

export const updateKiosk = form(updateKioskSchema, async (data) => {
    try {
        const user = getAuthenticatedUser();
        ensureAccess(user, 'kiosks');

        const { id, lookAheadDays, lookPastDays, ...updates } = data;

        const dbUpdates: any = { ...updates };
        if (lookAheadDays !== undefined) dbUpdates.lookAhead = Math.round(lookAheadDays * 86400);
        if (lookPastDays !== undefined) dbUpdates.lookPast = Math.round(lookPastDays * 86400);

        const [updated] = await db.update(kiosk)
            .set({
                ...dbUpdates,
                updatedAt: new Date()
            })
            .where(eq(kiosk.id, id))
            .returning();

        if (!updated) {
            error(404, 'Kiosk not found');
        }

        // Update Locations if provided
        if (data.locationIds !== undefined) {
            const locationIds = typeof data.locationIds === 'string' ? JSON.parse(data.locationIds) : data.locationIds;
            // Delete existing
            await db.delete(kioskLocation).where(eq(kioskLocation.kioskId, id));
            // Insert new
            if (locationIds && Array.isArray(locationIds) && locationIds.length > 0) {
                await db.insert(kioskLocation).values(
                    (locationIds as string[]).map((locationId: string) => ({
                        kioskId: id,
                        locationId,
                    }))
                );
            }
        }

        await getKiosk(id).refresh();
        await listKiosks().refresh();

        return { success: true };
    } catch (e: any) {
        console.error('Failed to update kiosk', e);
        return { success: false, error: e.message };
    }
});
