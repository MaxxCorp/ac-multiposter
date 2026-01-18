import { form } from '$app/server';
import { db } from '$lib/server/db';
import { kiosk } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';
import { getAuthenticatedUser, ensureAccess } from '$lib/authorization';
import { updateKioskSchema } from '$lib/validations/kiosks';
import { getKiosk } from './read.remote';
import { listKiosks } from '../list.remote';
import { error } from '@sveltejs/kit';

export const updateKiosk = form(updateKioskSchema, async (data) => {
    try {
        const user = getAuthenticatedUser();
        ensureAccess(user, 'events');

        const { id, lookAheadDays, lookPastDays, ...updates } = data;

        const dbUpdates: any = { ...updates };
        if (lookAheadDays !== undefined) dbUpdates.lookAhead = Math.round(lookAheadDays * 86400);
        if (lookPastDays !== undefined) dbUpdates.lookPast = Math.round(lookPastDays * 86400);

        const [updated] = await db.update(kiosk)
            .set({
                ...dbUpdates,
                updatedAt: new Date()
            })
            .where(and(eq(kiosk.id, id), eq(kiosk.userId, user.id)))
            .returning();

        if (!updated) {
            error(404, 'Kiosk not found');
        }

        await getKiosk(id).refresh();
        await listKiosks().refresh();

        return { success: true };
    } catch (e: any) {
        console.error('Failed to update kiosk', e);
        return { success: false, error: e.message };
    }
});
