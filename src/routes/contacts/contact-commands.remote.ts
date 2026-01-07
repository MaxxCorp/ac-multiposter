import { command } from '$app/server';
import { createContact, updateContact } from '$lib/server/contacts';
import { listContacts } from './list.remote';
import { readContact } from './[id]/read.remote';
import { ContactInputSchema, ContactUpdateSchema } from '$lib/validations/contacts';
import { z } from 'zod/mini';

/**
 * Command-based remote functions for programmatic contact operations.
 * These are used by ContactManager where form() functions can't be used
 * because they require binding to a <form> element.
 */

// Command for creating a contact programmatically
export const createContactCommand = command(ContactInputSchema as any, async (input) => {
    const data = input as any;
    // Sanitize contact data
    const {
        birthday,
        ...rest
    } = data.contact;

    const contactId = await createContact({
        contact: {
            ...rest,
            birthday: (birthday && !isNaN(new Date(birthday).getTime())) ? new Date(birthday) : null,
        } as any,
        emails: data.emails || undefined,
        phones: data.phones || undefined,
        addresses: data.addresses || undefined,
        relationIds: data.relationIds || undefined,
        tagNames: data.tagNames || undefined,
    });

    await listContacts().refresh();

    return { id: contactId };
});

// Command for updating a contact programmatically
export const updateContactCommand = command(ContactUpdateSchema as any, async (input) => {
    const { id, data } = input as any;
    // Sanitize contact data to exclude immutable metadata that might cause type errors (strings vs Dates)
    let sanitizedContact = undefined;
    if (data.contact) {
        const {
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
        emails: data.emails || undefined,
        phones: data.phones || undefined,
        addresses: data.addresses || undefined,
        relationIds: data.relationIds || undefined,
        tagNames: data.tagNames || undefined,
    } as any);

    await readContact(id).refresh();
    await listContacts().refresh();

    return result;
});
