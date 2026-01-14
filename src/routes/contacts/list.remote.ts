import * as v from 'valibot';
import { query } from '$app/server';
import { db } from '$lib/server/db';
import { contact } from '$lib/server/db/schema';
import { listQuery } from '$lib/server/db/query-helpers';

import { contactSchema, type Contact } from '$lib/validations/contacts';

export const listContacts = query(v.void_(), async (): Promise<Contact[]> => {
    const results = await listQuery({
        table: contact,
        featureName: 'contacts',
        transform: (row) => ({
            ...row,
            createdAt: row.createdAt.toISOString(),
            updatedAt: row.updatedAt.toISOString(),
            birthday: row.birthday ? row.birthday.toISOString() : null,
        }),
    });

    const contactsWithRelations = await Promise.all(results.map(async (c) => {
        const contactData = await db.query.contact.findFirst({
            where: (table, { eq }) => eq(table.id, c.id),
            with: {
                emails: true,
                phones: true,
                addresses: true,
                relations: {
                    with: {
                        targetContact: true
                    }
                },
                tags: {
                    with: {
                        tag: true
                    }
                }
            }
        });

        if (!contactData) return c;

        return {
            ...c,
            emails: contactData.emails,
            phones: contactData.phones,
            addresses: contactData.addresses,
            relations: (contactData.relations || []).map(r => ({
                id: r.id,
                targetContactId: r.targetContactId,
                relationType: r.relationType,
                targetContact: r.targetContact
            })),
            tags: (contactData.tags || []).map(t => ({
                id: t.tag.id,
                name: t.tag.name
            })),
        };
    }));

    return contactsWithRelations as Contact[];
});
