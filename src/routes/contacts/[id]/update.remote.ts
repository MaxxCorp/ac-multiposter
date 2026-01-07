import { form } from '$app/server';
import { updateContact } from '$lib/server/contacts';
import { listContacts } from '../list.remote';
import { readContact } from './read.remote';
import { ContactUpdateSchema } from '$lib/validations/contacts';

export const updateExistingContact = form(ContactUpdateSchema as any, async (input) => {
    const anyInput = input as any;
    const { id, data } = anyInput;

    // Parse JSON fields from root input
    const emails = anyInput.emailsJson ? JSON.parse(anyInput.emailsJson) : data.emails;
    const phones = anyInput.phonesJson ? JSON.parse(anyInput.phonesJson) : data.phones;
    const addresses = anyInput.addressesJson ? JSON.parse(anyInput.addressesJson) : data.addresses;
    const relationIds = anyInput.relationsJson ? JSON.parse(anyInput.relationsJson) : data.relationIds;
    const tagNames = anyInput.tagsJson ? JSON.parse(anyInput.tagsJson) : data.tagNames;

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
        emails,
        phones,
        addresses,
        relationIds,
        tagNames,
    } as any);

    await readContact(id).refresh();
    await listContacts().refresh();

    return result;
});
