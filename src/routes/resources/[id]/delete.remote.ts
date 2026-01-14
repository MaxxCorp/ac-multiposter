import { command } from '$app/server';
import { db } from '$lib/server/db';
import { resource } from '$lib/server/db/schema';
import { eq, and, inArray } from 'drizzle-orm';
import { listResources } from '../list.remote';
import { listResourcesWithHierarchy } from '../list-with-hierarchy.remote';
import { getAuthenticatedUser, ensureAccess } from '$lib/authorization';
import * as v from 'valibot';

export const deleteResource = command(v.array(v.string()), async (ids: string[]) => {
    const user = getAuthenticatedUser();
    ensureAccess(user, 'resources');

    await db
        .delete(resource)
        .where(inArray(resource.id, ids));

    await listResources().refresh();
    await listResourcesWithHierarchy().refresh();
    return { success: true };
});
