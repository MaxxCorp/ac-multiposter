import { form } from '$app/server';
import { db } from "$lib/server/db";
import { resource, resourceRelation } from "$lib/server/db/schema";
import { eq, and } from "drizzle-orm";
import { getAuthenticatedUser, ensureAccess } from "$lib/authorization";
import { updateResourceSchema } from "$lib/validations/resource";
import { listResources } from '../list.remote';
import { getResource } from './get.remote';

export const updateResource = form(updateResourceSchema, async (data) => {
    try {
        const user = getAuthenticatedUser();
        ensureAccess(user, 'resources');

        // Parse allocationCalendars from JSON string
        let parsedCalendars: Array<{ provider: string; calendarId: string }> | null = null;
        if (data.allocationCalendars) {
            try {
                parsedCalendars = JSON.parse(data.allocationCalendars);
            } catch {
                // Invalid JSON, ignore
            }
        }

        await db
            .update(resource)
            .set({
                name: data.name,
                description: data.description,
                type: data.type,
                locationId: data.locationId || null,
                allocationCalendars: parsedCalendars,
                updatedAt: new Date(),
            })
            .where(and(eq(resource.id, data.id), eq(resource.userId, user.id)));

        // Update parent-child relationships
        // First, delete all existing parent relationships for this resource
        await db
            .delete(resourceRelation)
            .where(eq(resourceRelation.childResourceId, data.id));

        // Then, create new relationships if parent resources are specified
        if (data.parentResourceIds && data.parentResourceIds.length > 0) {
            await db.insert(resourceRelation).values(
                data.parentResourceIds.map(parentId => ({
                    parentResourceId: parentId,
                    childResourceId: data.id,
                }))
            );
        }

        await getResource(data.id).refresh();
        await listResources().refresh();
        return { success: true };
    } catch (error: any) {
        console.error('[updateResource] Error:', error);
        if (error?.status && error?.location) {
            throw error;
        }
        return {
            success: false,
            error: error?.message || 'An unexpected error occurred'
        };
    }
});
