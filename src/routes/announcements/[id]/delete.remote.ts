import { command } from '$app/server';
import { db } from '$lib/server/db';
import { announcement } from '$lib/server/db/schema';
import { inArray } from 'drizzle-orm';
import { listAnnouncements } from '../list.remote';
import { getAuthenticatedUser, ensureAccess } from '$lib/authorization';
import { publishAnnouncementChange } from '$lib/server/realtime';
import * as v from 'valibot';

/**
 * Command for bulk deleting announcements
 */
export const deleteAnnouncements = command(v.array(v.string()), async (ids: string[]) => {
    const user = getAuthenticatedUser();
    ensureAccess(user, 'announcements');

    if (ids.length === 0) return { success: true };

    await db.transaction(async (tx) => {
        await tx.delete(announcement).where(inArray(announcement.id, ids));
    });

    // Notify listeners for each deleted announcement
    // Notify listeners
    await publishAnnouncementChange('delete', ids);

    await (listAnnouncements() as any).refresh();
    return { success: true };
});
