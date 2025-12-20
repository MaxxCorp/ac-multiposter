import { z } from 'zod';
import { query } from '$app/server';
import { getContact } from '$lib/server/contacts';
import { type Contact } from '$lib/validations/contacts';

export const readContact = query(z.string(), async (id: string): Promise<Contact | null> => {
    const result = await getContact(id);

    if (!result) return null;

    return {
        ...result,
        createdAt: result.createdAt.toISOString(),
        updatedAt: result.updatedAt.toISOString(),
        birthday: result.birthday ? result.birthday.toISOString() : null,
        emails: result.emails || [],
        phones: result.phones || [],
        addresses: result.addresses || [],
        relations: (result.relations || []).map(r => ({
            id: r.id,
            targetContactId: r.targetContactId,
            relationType: r.relationType,
            targetContact: r.targetContact
        })),
        tags: (result.tags || []).map(t => ({
            id: t.tag.id,
            name: t.tag.name
        }))
    } as unknown as Contact;
});
