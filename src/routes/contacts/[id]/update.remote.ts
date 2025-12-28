import { form } from '$app/server';
import { updateContact } from '$lib/server/contacts';
import { listContacts } from '../list.remote';
import { readContact } from './read.remote';
import { ContactUpdateSchema } from '$lib/validations/contacts';

export const updateExistingContact = form(ContactUpdateSchema, async ({ id, data }) => {
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
        emails: data.emails?.map(e => ({ ...e, id: crypto.randomUUID(), contactId: id })),
        phones: data.phones?.map(p => ({ ...p, id: crypto.randomUUID(), contactId: id })),
        addresses: data.addresses?.map(a => ({ ...a, id: crypto.randomUUID(), contactId: id })),
        relationIds: data.relationIds,
        tagNames: data.tagNames,
    } as any);

    await readContact(id).refresh();
    await listContacts().refresh();

    return result;
});
