import * as v from 'valibot';
import { command } from '$app/server';
import { db } from '$lib/server/db';
import { contact } from '$lib/server/db/schema';
import { inArray, and, eq } from 'drizzle-orm';
import { getAuthenticatedUser, ensureAccess } from '$lib/authorization';
import { listContacts } from '../list.remote';
import { getStorageProvider } from '$lib/server/blob-storage';

const deleteContactsSchema = v.array(v.string());

export const deleteExistingContact = command(deleteContactsSchema, async (ids) => {
    const user = getAuthenticatedUser();
    ensureAccess(user, 'contacts');

    if (!Array.isArray(ids) || ids.length === 0) return { count: 0 };

    // Fetch contacts to get asset paths before deletion
    const contactsToDelete = await db.query.contact.findMany({
        where: (table, { inArray }) => inArray(table.id, ids)
    });

    const result = await db.delete(contact)
        .where(inArray(contact.id, ids))
        .returning({ id: contact.id });

    const deletedIds = result.map(r => r.id);
    const storage = getStorageProvider();

    // Clean up assets for deleted contacts
    for (const contactItem of contactsToDelete) {
        if (deletedIds.includes(contactItem.id)) {
            if (contactItem.vCardPath) await storage.delete(contactItem.vCardPath);
            if (contactItem.qrCodePath) await storage.delete(contactItem.qrCodePath);
        }
    }

    await listContacts().refresh();
    return { count: result.length, ids: deletedIds };
});
