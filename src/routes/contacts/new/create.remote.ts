import { form } from '$app/server';
import { createContact } from '$lib/server/contacts';
import { listContacts } from '../list.remote';
import { ContactInputSchema } from '$lib/validations/contacts';

export const createNewContact = form(ContactInputSchema, async (data) => {
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
        emails: data.emails,
        phones: data.phones,
        addresses: data.addresses,
        relationIds: data.relationIds,
        tagNames: data.tagNames,
    });

    await listContacts().refresh();

    return { id: contactId };
});
