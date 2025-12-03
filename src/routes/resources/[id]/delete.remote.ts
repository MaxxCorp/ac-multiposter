import { z } from 'zod/mini';
import { command } from '$app/server';
import { db } from "$lib/server/db";
import { resource } from "$lib/server/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import { getAuthenticatedUser } from "$lib/authorization";

export const deleteResource = command(z.array(z.string()), async (ids: string[]) => {
    const user = getAuthenticatedUser();

    await db
        .delete(resource)
        .where(and(eq(resource.userId, user.id), inArray(resource.id, ids)));

    return { success: true };
});
