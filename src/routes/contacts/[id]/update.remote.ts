import { z } from 'zod/mini';
import { command } from '$app/server';
import { updateContact } from '$lib/server/contacts';
import { listContacts } from '../list.remote';
import { readContact } from './read.remote';

const ContactUpdateSchema = z.object({
    id: z.string(),
    data: z.object({
        contact: z.optional(z.any()),
        emails: z.optional(z.array(z.object({
            value: z.string(),
            type: z.optional(z.string()),
            primary: z.boolean(),
        }))),
        phones: z.optional(z.array(z.object({
            value: z.string(),
            type: z.optional(z.string()),
            primary: z.boolean(),
        }))),
        addresses: z.optional(z.array(z.object({
            street: z.optional(z.string()),
            houseNumber: z.optional(z.string()),
            addressSuffix: z.optional(z.string()),
            zip: z.optional(z.string()),
            city: z.optional(z.string()),
            state: z.optional(z.string()),
            country: z.optional(z.string()),
            type: z.optional(z.string()),
            primary: z.boolean(),
        }))),
        relationIds: z.optional(z.array(z.object({
            targetContactId: z.string(),
            relationType: z.string(),
        }))),
        tagNames: z.optional(z.array(z.string())),
    }),
});

export const updateExistingContact = command(ContactUpdateSchema, async ({ id, data }) => {
    // Sanitize contact data to exclude immutable metadata that might cause type errors (strings vs Dates)
    let sanitizedContact = undefined;
    if (data.contact) {
        const {
            id: _id,
            userId: _userId,
            createdAt: _createdAt,
            updatedAt: _updatedAt,
            vCardPath: _vCardPath,
            qrCodePath: _qrCodePath,
            birthday,
            ...rest
        } = data.contact;

        sanitizedContact = {
            ...rest,
            birthday: birthday === undefined
                ? undefined
                : (birthday && !isNaN(new Date(birthday).getTime()))
                    ? new Date(birthday)
                    : null,
        };
    }

    const result = await updateContact(id, {
        contact: sanitizedContact,
        emails: data.emails?.map(e => ({ ...e, id: crypto.randomUUID(), contactId: id })),
        phones: data.phones?.map(p => ({ ...p, id: crypto.randomUUID(), contactId: id })),
        addresses: data.addresses?.map(a => ({ ...a, id: crypto.randomUUID(), contactId: id })),
        relationIds: data.relationIds,
        tagNames: data.tagNames,
    } as any);

    await readContact(id).refresh();
    await listContacts().refresh();

    return { id: result };
});
