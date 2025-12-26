import { z } from 'zod/mini';
import { command } from '$app/server';
import { createContact } from '$lib/server/contacts';
import { listContacts } from '../list.remote';

const ContactInputSchema = z.object({
    contact: z.any(),
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
});

export const createNewContact = command(ContactInputSchema, async (data) => {
    // Sanitize contact data
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

    const contactId = await createContact({
        contact: {
            ...rest,
            birthday: (birthday && !isNaN(new Date(birthday).getTime())) ? new Date(birthday) : null,
        } as any,
        emails: data.emails?.map(e => ({ ...e, id: crypto.randomUUID(), contactId: '' })),
        phones: data.phones?.map(p => ({ ...p, id: crypto.randomUUID(), contactId: '' })),
        addresses: data.addresses?.map(a => ({ ...a, id: crypto.randomUUID(), contactId: '' })),
        relationIds: data.relationIds,
        tagNames: data.tagNames,
    });

    await listContacts().refresh();

    return { id: contactId };
});
