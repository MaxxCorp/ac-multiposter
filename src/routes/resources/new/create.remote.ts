import { form } from '$app/server';
import { db } from '$lib/server/db';
import { resource } from '$lib/server/db/schema';
import { listResources } from '../list.remote';
import { listResourcesWithHierarchy } from '../list-with-hierarchy.remote';
import { getAuthenticatedUser, ensureAccess } from '$lib/authorization';
import { createResourceSchema } from '$lib/validations/resources';

export const createResource = form(createResourceSchema, async (data) => {
    console.log('--- createResource START ---');
    console.log('Data received:', JSON.stringify(data, null, 2));

    try {
        const user = getAuthenticatedUser();
        ensureAccess(user, 'resources');
        console.log('User authenticated:', user.id);

        const maxOccupancy = data.maxOccupancy ? Number(data.maxOccupancy) : null;

        const insertData: any = {
            userId: user.id,
            name: data.name,
            description: data.description || null,
            type: data.type,
            maxOccupancy: isNaN(maxOccupancy as any) ? null : maxOccupancy,
            locationId: data.locationId || null,
        };

        console.log('Insert payload:', insertData);

        const result = await db.insert(resource).values(insertData).returning();

        if (result.length === 0) {
            throw new Error('Failed to create resource');
        }

        const newResource = result[0];
        await listResources().refresh();
        await listResourcesWithHierarchy().refresh();

        console.log('--- createResource SUCCESS ---');
        return { success: true, resource: newResource };

    } catch (err: any) {
        console.error('--- createResource ERROR ---', err);
        return { success: false, error: { message: err.message || 'Creation failed' } };
    }
});
