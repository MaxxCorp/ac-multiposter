import { z } from 'zod/mini';
import { command } from '$app/server';
import { updateContact } from '$lib/server/contacts';
import { listContacts } from '../list.remote';
import { readContact } from './read.remote';

const ContactUpdateSchema = z.object({
    id: z.string(),
    data: z.object({
        contact: z.optional(z.object({
            displayName: z.optional(z.string()),
            givenName: z.optional(z.string()),
            familyName: z.optional(z.string()),
            middleName: z.optional(z.string()),
            honorificPrefix: z.optional(z.string()),
            honorificSuffix: z.optional(z.string()),
            birthday: z.optional(z.string()),
            gender: z.optional(z.string()),
            notes: z.optional(z.string()),
            isPublic: z.optional(z.boolean()),
        })),
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
    const result = await updateContact(id, {
        contact: data.contact ? {
            ...data.contact,
            birthday: data.contact.birthday ? new Date(data.contact.birthday) : undefined,
        } : undefined,
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
