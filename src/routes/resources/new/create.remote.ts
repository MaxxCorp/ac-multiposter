import { form } from '$app/server';
import { db } from '$lib/server/db';
import { resource } from '$lib/server/db/schema';
import { listResources } from '../list.remote';
import { listResourcesWithHierarchy } from '../list-with-hierarchy.remote';
import { getAuthenticatedUser, ensureAccess } from '$lib/authorization';
import { createResourceSchema } from '$lib/validations/resources';

export const createResource = form(createResourceSchema, async (data) => {
    const user = getAuthenticatedUser();
    ensureAccess(user, 'resources');

    const maxOccupancy = data.maxOccupancy ? Number(data.maxOccupancy) : null;

    const result = await db.insert(resource).values({
        userId: user.id,
        name: data.name,
        description: data.description || null,
        type: data.type,
        maxOccupancy: isNaN(maxOccupancy as any) ? null : maxOccupancy,
        locationId: data.locationId || null,
    }).returning();


    await listResources().refresh();
    await listResourcesWithHierarchy().refresh();
    return result[0];
});
