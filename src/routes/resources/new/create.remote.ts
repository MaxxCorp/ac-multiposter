import { form } from '$app/server';
import { db } from "$lib/server/db";
import { resource, resourceRelation } from "$lib/server/db/schema";
import { getAuthenticatedUser, ensureAccess } from "$lib/authorization";
import { createResourceSchema } from "$lib/validations/resource";
import { listResources } from '../list.remote';

export const createResource = form(createResourceSchema, async (data) => {
    try {
        const user = getAuthenticatedUser();
        ensureAccess(user, 'resources');

        const newResourceId = crypto.randomUUID();

        // Parse allocationCalendars from JSON string
        let parsedCalendars: Array<{ provider: string; calendarId: string }> | null = null;
        if (data.allocationCalendars) {
            try {
                parsedCalendars = JSON.parse(data.allocationCalendars);
            } catch {
                // Invalid JSON, ignore
            }
        }

        const result = await db.insert(resource).values({
            id: newResourceId,
            userId: user.id,
            name: data.name,
            description: data.description,
            type: data.type,
            locationId: data.locationId || null,
            allocationCalendars: parsedCalendars,
        }).returning();

        const row = result[0];
        if (!row) {
            throw new Error('Failed to create resource');
        }

        // Create parent-child relationships if parent resources are specified
        if (data.parentResourceIds && data.parentResourceIds.length > 0) {
            await db.insert(resourceRelation).values(
                data.parentResourceIds.map(parentId => ({
                    parentResourceId: parentId,
                    childResourceId: newResourceId,
                }))
            );
        }

        await listResources().refresh();
        return { success: true };
    } catch (error: any) {
        console.error('[createResource] Error:', error);
        if (error?.status && error?.location) {
            throw error;
        }
        return {
            success: false,
            error: error?.message || 'An unexpected error occurred'
        };
    }
});
