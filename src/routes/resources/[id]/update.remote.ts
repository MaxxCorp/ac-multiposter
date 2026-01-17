import { form } from '$app/server';
import { db } from '$lib/server/db';
import { resource, resourceRelation } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';
import { listResources } from '../list.remote';
import { listResourcesWithHierarchy } from '../list-with-hierarchy.remote';
import { readResource } from './read.remote';
import { getAuthenticatedUser, ensureAccess } from '$lib/authorization';
import { updateResourceSchema } from '$lib/validations/resources';

export const updateResource = form(updateResourceSchema, async (data) => {
    console.log('--- updateResource START ---');
    console.log('Data received:', JSON.stringify(data, null, 2));

    try {
        const user = getAuthenticatedUser();
        ensureAccess(user, 'resources');
        console.log('User authenticated:', user.id);

        const maxOccupancy = data.maxOccupancy ? Number(data.maxOccupancy) : null;

        const updateData: any = {
            name: data.name,
            description: data.description || null,
            type: data.type,
            maxOccupancy: isNaN(maxOccupancy as any) ? null : maxOccupancy,
            locationId: data.locationId || null,
            updatedAt: new Date(),
        };

        console.log('Update payload:', updateData);

        const result = await db.update(resource)
            .set(updateData)
            .where(eq(resource.id, data.id))
            .returning();

        if (result.length === 0) {
            console.error('No rows updated. ID might be wrong or missing.');
            return { success: false, error: { message: 'Resource not found or update failed' } };
        }

        const updated = result[0];

        // Sync parent relations
        // 1. Delete all existing parent relations for this child
        await db.delete(resourceRelation)
            .where(eq(resourceRelation.childResourceId, data.id));

        // 2. Insert new ones if any
        if (data.parentResourceIds && data.parentResourceIds.length > 0) {
            console.log('Updating parent relations:', data.parentResourceIds);
            await db.insert(resourceRelation).values(
                data.parentResourceIds.map((parentId) => ({
                    parentResourceId: parentId,
                    childResourceId: data.id,
                }))
            );
        }

        await readResource(data.id).refresh();
        await listResources().refresh();
        await listResourcesWithHierarchy().refresh();

        console.log('--- updateResource SUCCESS ---');
        return { success: true, resource: updated };
    } catch (err: any) {
        console.error('--- updateResource ERROR ---', err);
        return { success: false, error: { message: err.message || 'Update failed' } };
    }
});
