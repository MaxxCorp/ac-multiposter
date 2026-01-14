import { form } from '$app/server';
import { updateContact } from '$lib/server/contacts';
import { listContacts } from '../list.remote';
import { readContact } from './read.remote';
import { updateContactSchema } from '$lib/validations/contacts';
import { getAuthenticatedUser, ensureAccess } from '$lib/authorization';

export const updateExistingContact = form(updateContactSchema, async (input) => {
    console.log('--- updateExistingContact START ---');
    try {
        const user = getAuthenticatedUser();
        ensureAccess(user, 'contacts');
        console.log('User authenticated:', user.id);

        const anyInput = input as any;
        const { id, data } = anyInput;
        console.log('Update ID:', id);
        console.log('Update Data:', JSON.stringify(data, null, 2));

        // Parse JSON fields from root input
        let emails = data.emails;
        let phones = data.phones;
        let addresses = data.addresses;
        let relationIds = data.relationIds;
        let tagNames = data.tagNames;

        try {
            if (anyInput.emailsJson) emails = JSON.parse(anyInput.emailsJson);
            if (anyInput.phonesJson) phones = JSON.parse(anyInput.phonesJson);
            if (anyInput.addressesJson) addresses = JSON.parse(anyInput.addressesJson);
            if (anyInput.relationsJson) relationIds = JSON.parse(anyInput.relationsJson);
            if (anyInput.tagsJson) tagNames = JSON.parse(anyInput.tagsJson);
        } catch (e) {
            console.error('JSON parsing error:', e);
        }

        console.log('Parsed complex fields:', { emails, phones, addresses, relationIds, tagNames });

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

        console.log('Calling updateContact helper...');
        const result = await updateContact(id, {
            contact: sanitizedContact,
            emails,
            phones,
            addresses,
            relationIds,
            tagNames,
        } as any);

        console.log('Update result:', result);

        await readContact(id).refresh();
        await listContacts().refresh();

        console.log('--- updateExistingContact SUCCESS ---');
        return { success: true, contact: result };

    } catch (err: any) {
        console.error('--- updateExistingContact ERROR ---', err);
        return { success: false, error: { message: err.message || 'Update failed' } };
    }
});
