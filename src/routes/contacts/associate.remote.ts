import { command, query } from '$app/server';
import { associateContact, dissociateContact, getEntityContacts } from '$lib/server/contacts';
import { type Contact, AssociationSchema, UpdateAssociationSchema, GetAssociationsSchema } from '$lib/validations/contacts';

export const addAssociation = command(AssociationSchema, async (data) => {
    const { type, entityId, contactId } = data;
    await associateContact(type as any, entityId, contactId);
    return { success: true };
});

export const removeAssociation = command(AssociationSchema, async (data) => {
    const { type, entityId, contactId } = data;
    await dissociateContact(type as any, entityId, contactId);
    return { success: true };
});

export const updateAssociationStatusRemote = command(UpdateAssociationSchema, async (data) => {
    const { type, entityId, contactId, status } = data;
    const { updateAssociationStatus } = await import('$lib/server/contacts');
    await updateAssociationStatus(type, entityId, contactId, status);
    return { success: true };
});

export const fetchEntityContacts = query(GetAssociationsSchema, async (data): Promise<Contact[]> => {
    const { type, entityId } = data;
    const results = await getEntityContacts(type as any, entityId);
    return results.map((r: any) => ({
        ...r,
        participationStatus: r.participationStatus,
        createdAt: r.createdAt.toISOString(),
        updatedAt: r.updatedAt.toISOString(),
        birthday: r.birthday ? r.birthday.toISOString() : null,
        emails: r.emails || [],
        phones: r.phones || [],
        addresses: r.addresses || [],
        relations: (r.relations || []).map((rel: any) => ({
            id: rel.id,
            targetContactId: rel.targetContactId,
            relationType: rel.relationType,
            targetContact: rel.targetContact
        })),
        tags: (r.tags || []).map((t: any) => ({
            id: t.tag.id,
            name: t.tag.name
        }))
    })) as Contact[];
});
