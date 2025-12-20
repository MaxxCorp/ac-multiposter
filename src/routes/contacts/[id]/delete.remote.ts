import { z } from 'zod/mini';
import { command } from '$app/server';
import { db } from '$lib/server/db';
import { contact } from '$lib/server/db/schema';
import { inArray, and, eq } from 'drizzle-orm';
import { getAuthenticatedUser, ensureAccess } from '$lib/authorization';
import { listContacts } from '../list.remote';

const deleteContactsSchema = z.array(z.string());

export const deleteExistingContact = command(deleteContactsSchema, async (ids) => {
    const user = getAuthenticatedUser();
    ensureAccess(user, 'contacts');

    if (!Array.isArray(ids) || ids.length === 0) return { count: 0 };

    const result = await db.delete(contact)
        .where(and(eq(contact.userId, user.id), inArray(contact.id, ids)))
        .returning({ id: contact.id });

    await listContacts().refresh();
    return { count: result.length, ids: result.map(r => r.id) };
});
