import { z } from 'zod/mini';
import { command } from '$app/server';
import { createContact } from '$lib/server/contacts';
import { listContacts } from '../list.remote';

const ContactInputSchema = z.object({
    contact: z.object({
        displayName: z.optional(z.string()),
        givenName: z.optional(z.string()),
        familyName: z.optional(z.string()),
        middleName: z.optional(z.string()),
        honorificPrefix: z.optional(z.string()),
        honorificSuffix: z.optional(z.string()),
        birthday: z.optional(z.string()),
        gender: z.optional(z.string()),
        notes: z.optional(z.string()),
        isPublic: z.boolean(),
    }),
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
    const contactId = await createContact({
        contact: {
            ...data.contact,
            birthday: data.contact.birthday ? new Date(data.contact.birthday) : null,
        },
        emails: data.emails?.map(e => ({ ...e, id: crypto.randomUUID(), contactId: '' })),
        phones: data.phones?.map(p => ({ ...p, id: crypto.randomUUID(), contactId: '' })),
        addresses: data.addresses?.map(a => ({ ...a, id: crypto.randomUUID(), contactId: '' })),
        relationIds: data.relationIds,
        tagNames: data.tagNames,
    } as any);

    await listContacts().refresh();

    return { id: contactId };
});
