import { z } from 'zod/mini';
import { query } from '$app/server';
import { getContact } from '$lib/server/contacts';
import { type Contact } from '$lib/validations/contacts';

import { getAuthenticatedUser } from '$lib/authorization';

export const readContact = query(z.string(), async (id: string): Promise<Contact | null> => {
    const result = await getContact(id);

    if (!result) return null;

    let user = null;
    try {
        user = getAuthenticatedUser();
    } catch {
        // User not authenticated
    }

    const isPublic = !user;

    return {
        ...result,
        createdAt: result.createdAt.toISOString(),
        updatedAt: result.updatedAt.toISOString(),
        birthday: result.birthday ? result.birthday.toISOString() : null,
        emails: (result.emails || []).filter(e => !isPublic || e.type?.toLowerCase() === 'work'),
        phones: (result.phones || []).filter(p => !isPublic || p.type?.toLowerCase() === 'work'),
        addresses: (result.addresses || []).filter(a => !isPublic || a.type?.toLowerCase() === 'work'),
        relations: (result.relations || []).map(r => ({
            id: r.id,
            targetContactId: r.targetContactId,
            relationType: r.relationType,
            targetContact: r.targetContact
        })),
        tags: (result.tags || []).map(t => ({
            id: t.tag.id,
            name: t.tag.name
        })),
        vCardPath: (result.vCardPath && isPublic) ? result.vCardPath.replace(/(\.vcf)$/i, '_public$1') : result.vCardPath,
        qrCodePath: (result.qrCodePath && isPublic) ? result.qrCodePath.replace(/(\.png)$/i, '_public$1') : result.qrCodePath
    } as unknown as Contact;
});
