import { command } from '$app/server';
import { createContact } from '$lib/server/contacts';
import { listContacts } from '../list.remote';
import { ContactInputSchema } from '$lib/validations/contacts';

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
