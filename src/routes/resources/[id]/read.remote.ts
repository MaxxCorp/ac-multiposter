import { z } from 'zod/mini';
import { query } from '$app/server';
import { db } from "$lib/server/db";
import { resource, resourceRelation } from "$lib/server/db/schema";
import { eq, and } from "drizzle-orm";
import { getAuthenticatedUser } from "$lib/authorization";

export const readResource = query(z.string(), async (id: string) => {
    const user = getAuthenticatedUser();
    const [item] = await db
        .select()
        .from(resource)
        .where(and(eq(resource.id, id), eq(resource.userId, user.id)));

    if (!item) {
        return null;
    }

    // Get parent resources
    const parentRelations = await db
        .select()
        .from(resourceRelation)
        .where(eq(resourceRelation.childResourceId, id));

    return {
        ...item,
        parentResourceIds: parentRelations.map(r => r.parentResourceId),
    };
});
