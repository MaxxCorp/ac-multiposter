import { command } from '$app/server';
import { db } from '$lib/server/db';
import { location } from '$lib/server/db/schema';
import { eq, and, inArray } from 'drizzle-orm';
import { listLocations } from '../list.remote';
import { getAuthenticatedUser, ensureAccess } from '$lib/authorization';
import * as v from 'valibot';

export const deleteLocation = command(v.array(v.string()), async (ids: string[]) => {
    const user = getAuthenticatedUser();
    ensureAccess(user, 'locations');

    await db
        .delete(location)
        .where(inArray(location.id, ids));

    await listLocations().refresh();
    return { success: true };
});
