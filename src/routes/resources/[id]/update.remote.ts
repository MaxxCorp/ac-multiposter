import { form } from '$app/server';
import { db } from '$lib/server/db';
import { resource } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';
import { listResources } from '../list.remote';
import { listResourcesWithHierarchy } from '../list-with-hierarchy.remote';
import { readResource } from './read.remote';
import { getAuthenticatedUser, ensureAccess } from '$lib/authorization';
import { updateResourceSchema } from '$lib/validations/resources';

export const updateResource = form(updateResourceSchema, async (data) => {
    const user = getAuthenticatedUser();
    ensureAccess(user, 'resources');

    const maxOccupancy = data.maxOccupancy ? Number(data.maxOccupancy) : null;

    const result = await db.update(resource)
        .set({
            name: data.name,
            description: data.description || null,
            type: data.type,
            maxOccupancy: isNaN(maxOccupancy as any) ? null : maxOccupancy,
            locationId: data.locationId || null,
            updatedAt: new Date(),
        })

        .where(eq(resource.id, data.id))
        .returning();

    const updated = result[0];
    await readResource(data.id).refresh();
    await listResources().refresh();
    await listResourcesWithHierarchy().refresh();

    return updated;
});
