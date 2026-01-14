import { query } from '$app/server';
import { getContact } from '$lib/server/contacts';
import { type Contact } from '$lib/validations/contacts';
import { getAuthenticatedUser, ensureAccess } from '$lib/authorization';
import * as v from 'valibot';

export const readContact = query(v.string(), async (id: string): Promise<any> => {
    const user = getAuthenticatedUser();
    ensureAccess(user, 'contacts');

    const result = await getContact(id);

    if (!result) return null;

    return {
        ...result,
        tags: result.tags.map((t: any) => ({
            id: t.tag.id,
            name: t.tag.name
        }))
    };
});
