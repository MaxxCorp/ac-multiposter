import { z } from 'zod/mini';
import { command } from '$app/server';
import { db } from "$lib/server/db";
import { location } from "$lib/server/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import { getAuthenticatedUser } from "$lib/authorization";

export const deleteLocation = command(z.array(z.string()), async (ids: string[]) => {
    const user = getAuthenticatedUser();

    await db
        .delete(location)
        .where(and(eq(location.userId, user.id), inArray(location.id, ids)));

    return { success: true };
});
