import { form } from '$app/server';
import { createContact } from '$lib/server/contacts';
import { listContacts } from '../list.remote';
import { ContactInputSchema } from '$lib/validations/contacts';

export const createNewContact = form(ContactInputSchema as any, async (input) => {
    const data = input as any;

    // Parse JSON fields commonly used to bypass FormData nesting issues
    const emails = data.emailsJson ? JSON.parse(data.emailsJson) : data.emails;
    const phones = data.phonesJson ? JSON.parse(data.phonesJson) : data.phones;
    const addresses = data.addressesJson ? JSON.parse(data.addressesJson) : data.addresses;
    const relationIds = data.relationsJson ? JSON.parse(data.relationsJson) : data.relationIds;
    const tagNames = data.tagsJson ? JSON.parse(data.tagsJson) : data.tagNames;

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
        emails,
        phones,
        addresses,
        relationIds,
        tagNames,
    });

    try {
        await listContacts().refresh();
    } catch (err) {
        console.error("Failed to refresh contact list:", err);
    }

    return { id: contactId };
});
