import { query } from '$app/server';
import { db } from '$lib/server/db';
import { tag } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { getAuthenticatedUser } from '$lib/authorization';

export const listTags = query(async () => {
    const user = getAuthenticatedUser();
    return db.query.tag.findMany({
        where: eq(tag.userId, user.id)
    });
});
