import { z } from 'zod/mini';
import { query } from '$app/server';
import { db } from "$lib/server/db";
import { location } from "$lib/server/db/schema";
import { eq, and } from "drizzle-orm";
import { getAuthenticatedUser } from "$lib/authorization";

export const getLocation = query(z.string(), async (id: string) => {
    const user = getAuthenticatedUser();
    const [item] = await db
        .select()
        .from(location)
        .where(and(eq(location.id, id), eq(location.userId, user.id)));

    return item;
});
