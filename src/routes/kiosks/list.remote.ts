import { query } from '$app/server';
import { db } from '$lib/server/db';
import { eq, desc } from 'drizzle-orm';
import { kiosk, type Kiosk } from '$lib/server/db/schema';
import { getAuthenticatedUser, ensureAccess } from '$lib/authorization';

export type { Kiosk };

/**
 * List all Kiosks
 */
export const listKiosks = query(async () => {
    const user = getAuthenticatedUser();
    ensureAccess(user, 'kiosks'); // Using 'kiosks' feature access

    return await db.select()
        .from(kiosk)
        .orderBy(desc(kiosk.createdAt));
});
