import { command } from '$app/server';
import { db } from '$lib/server/db';
import { kiosk } from '$lib/server/db/schema';
import { eq, and, inArray } from 'drizzle-orm';
import { getAuthenticatedUser, ensureAccess } from '$lib/authorization';
import * as v from 'valibot';
import { listKiosks } from '../list.remote';

export const deleteKiosk = command(
    v.pipe(v.array(v.string()), v.minLength(1)),
    async (ids: string[]) => {
        const user = getAuthenticatedUser();
        ensureAccess(user, 'events');

        await db.delete(kiosk)
            .where(
                and(
                    inArray(kiosk.id, ids),
                    eq(kiosk.userId, user.id)
                )
            );

        await listKiosks().refresh();
        return { success: true };
    }
);
