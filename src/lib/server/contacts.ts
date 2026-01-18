import { db } from './db';
import {
    contact, contactEmail, contactPhone, contactAddress,
    userContact, locationContact, resourceContact, eventContact, announcementContact,
    contactRelation, tag, contactTag
} from './db/schema';
import { eq, and, inArray } from 'drizzle-orm';
import { getRequestEvent } from '$app/server';
import { getAuthenticatedUser, ensureAccess, parseRoles, hasAccess } from '$lib/authorization';
import QRCode from 'qrcode';
import ICAL from 'ical.js';
import { getStorageProvider } from './blob-storage';
import { env } from '$env/dynamic/private';

/**
 * Backend logic for managing contacts and their associations.
 * Designed according to Google People API documentation.
 */

/**
 * Generate vCard and QR Code for a contact
 */
async function generateContactAssets(contactId: string, origin?: string) {
    const data = await db.query.contact.findFirst({
        where: (table, { eq }) => eq(table.id, contactId),
        with: {
            emails: true,
            phones: true,
            addresses: true
        }
    });

    if (!data) return;

    // vCard generation using ical.js (vCard RFC 6350 support via jCard format)
    const card = new ICAL.Component(['vcard', [], []]);
    card.addPropertyWithValue('version', '4.0');

    const fullName = data.displayName || `${data.givenName || ''} ${data.familyName || ''}`.trim();
    if (fullName) {
        card.addPropertyWithValue('fn', fullName);
    }

    // Name property (N): Family Name; Given Name; Additional Names; Honorific Prefixes; Honorific Suffixes
    card.addPropertyWithValue('n', [
        data.familyName || '',
        data.givenName || '',
        data.middleName || '',
        data.honorificPrefix || '',
        data.honorificSuffix || ''
    ]);

    data.emails?.forEach((e: any) => {
        const prop = card.addPropertyWithValue('email', e.value);
        if (e.type) prop.setParameter('type', e.type.toLowerCase());
    });

    data.phones?.forEach((p: any) => {
        const prop = card.addPropertyWithValue('tel', p.value);
        if (p.type) prop.setParameter('type', p.type.toLowerCase());
    });

    data.addresses?.forEach((a: any) => {
        // ADR: post-office box; extended address; street address; locality; region; postal code; country name
        const adrValue = [
            '', // po box
            a.addressSuffix || '',
            `${a.street || ''} ${a.houseNumber || ''}`.trim(),
            a.city || '',
            a.state || '',
            a.zip || '',
            a.country || ''
        ];
        const prop = card.addPropertyWithValue('adr', adrValue);
        if (a.type) prop.setParameter('type', a.type.toLowerCase());
    });

    if (data.notes) {
        card.addPropertyWithValue('note', data.notes);
    }

    // Public vCard generation (Work data only)
    const publicCard = new ICAL.Component(['vcard', [], []]);
    publicCard.addPropertyWithValue('version', '4.0');
    if (fullName) publicCard.addPropertyWithValue('fn', fullName);
    publicCard.addPropertyWithValue('n', [
        data.familyName || '',
        data.givenName || '',
        data.middleName || '',
        data.honorificPrefix || '',
        data.honorificSuffix || ''
    ]);

    data.emails?.filter((e: any) => e.type?.toLowerCase() === 'work').forEach((e: any) => {
        const prop = publicCard.addPropertyWithValue('email', e.value);
        if (e.type) prop.setParameter('type', e.type.toLowerCase());
    });

    data.phones?.filter((p: any) => p.type?.toLowerCase() === 'work').forEach((p: any) => {
        const prop = publicCard.addPropertyWithValue('tel', p.value);
        if (p.type) prop.setParameter('type', p.type.toLowerCase());
    });

    data.addresses?.filter((a: any) => a.type?.toLowerCase() === 'work').forEach((a: any) => {
        const adrValue = [
            '',
            a.addressSuffix || '',
            `${a.street || ''} ${a.houseNumber || ''}`.trim(),
            a.city || '',
            a.state || '',
            a.zip || '',
            a.country || ''
        ];
        const prop = publicCard.addPropertyWithValue('adr', adrValue);
        if (a.type) prop.setParameter('type', a.type.toLowerCase());
    });

    const storage = getStorageProvider();
    const fullNameSlug = fullName.replace(/\s+/g, '_');

    const oldVCardPath = data.vCardPath;
    const oldQrCodePath = data.qrCodePath;

    // Upload vCards
    const vCardFileName = `contacts/${contactId}/${fullNameSlug}.vcf`;
    const vCardUrl = await storage.put(vCardFileName, card.toString(), 'text/vcard');

    const publicVCardFileName = `contacts/${contactId}/${fullNameSlug}_public.vcf`;
    await storage.put(publicVCardFileName, publicCard.toString(), 'text/vcard');

    // QR Code generation
    const baseUrl = env.PUBLIC_BASE_URL || origin || "";
    const contactUrl = `${baseUrl}/contacts/${contactId}/view`;

    // Generate QR as Buffer
    const qrBuffer = await QRCode.toBuffer(contactUrl, {
        width: 300,
        margin: 2,
        color: { dark: '#1e40af', light: '#ffffff' }
    });

    const qrCodeFileName = `contacts/${contactId}/qr.png`;
    const qrCodeUrl = await storage.put(qrCodeFileName, qrBuffer, 'image/png');

    const publicQrCodeFileName = `contacts/${contactId}/qr_public.png`;
    await storage.put(publicQrCodeFileName, qrBuffer, 'image/png');

    // Update paths in DB
    await db.update(contact)
        .set({
            vCardPath: vCardUrl,
            qrCodePath: qrCodeUrl
        })
        .where(eq(contact.id, contactId));

    // Clean up old assets if paths changed
    if (oldVCardPath && oldVCardPath !== vCardUrl) await storage.delete(oldVCardPath);
    if (oldQrCodePath && oldQrCodePath !== qrCodeUrl) await storage.delete(oldQrCodePath);
}

export interface ContactData {
    contact: Partial<typeof contact.$inferInsert> & { displayName: string };
    emails?: (Omit<typeof contactEmail.$inferInsert, 'contactId'> & { contactId?: string })[];
    phones?: (Omit<typeof contactPhone.$inferInsert, 'contactId'> & { contactId?: string })[];
    addresses?: (Omit<typeof contactAddress.$inferInsert, 'contactId'> & { contactId?: string })[];
    relationIds?: { targetContactId: string, relationType: string }[];
    tagNames?: string[];
}

/**
 * Create a new contact with related fields
 */
export async function createContact(data: ContactData) {
    const user = getAuthenticatedUser();
    ensureAccess(user, 'contacts');

    const contactId = await db.transaction(async (tx) => {


        // Insert main contact
        const [newContact] = await tx.insert(contact).values({
            userId: user.id,
            displayName: data.contact.displayName,
            givenName: data.contact.givenName || null,
            familyName: data.contact.familyName || null,
            middleName: data.contact.middleName || null,
            honorificPrefix: data.contact.honorificPrefix || null,
            honorificSuffix: data.contact.honorificSuffix || null,
            birthday: data.contact.birthday || null,
            gender: data.contact.gender || null,
            notes: data.contact.notes || null,
            isPublic: data.contact.isPublic || false
        }).returning({ id: contact.id });

        const id = newContact.id;

        // Insert emails
        if (data.emails && data.emails.length > 0) {

            const emailsToInsert = data.emails.map(e => ({
                contactId: id,
                value: e.value,
                type: e.type || 'other',
                primary: !!e.primary
            }));

            await tx.insert(contactEmail).values(emailsToInsert);
        }

        // Insert phones
        if (data.phones && data.phones.length > 0) {

            const phonesToInsert = data.phones.map(p => ({
                contactId: id,
                value: p.value,
                type: p.type || 'other',
                primary: !!p.primary
            }));
            await tx.insert(contactPhone).values(phonesToInsert);
        }

        // Insert addresses
        if (data.addresses && data.addresses.length > 0) {

            const addressesToInsert = data.addresses.map(a => ({
                contactId: id,
                street: a.street || null,
                houseNumber: a.houseNumber || null,
                addressSuffix: a.addressSuffix || null,
                zip: a.zip || null,
                city: a.city || null,
                state: a.state || null,
                country: a.country || null,
                type: a.type || 'other',
                primary: !!a.primary
            }));
            await tx.insert(contactAddress).values(addressesToInsert);
        }

        // Insert relations
        if (data.relationIds && data.relationIds.length > 0) {

            const relationsToInsert = data.relationIds.map(r => ({
                contactId: id,
                targetContactId: r.targetContactId,
                relationType: r.relationType
            }));
            await tx.insert(contactRelation).values(relationsToInsert);
        }

        // Insert tags
        if (data.tagNames && data.tagNames.length > 0) {

            for (const tagName of data.tagNames) {
                // Find or create tag
                let tagId: string;
                const existingTag = await tx.query.tag.findFirst({
                    where: (t, { eq }) => eq(t.name, tagName)
                });

                if (existingTag) {
                    tagId = existingTag.id;
                } else {
                    const [newTag] = await tx.insert(tag).values({
                        name: tagName,
                        userId: user.id
                    }).returning({ id: tag.id });
                    tagId = newTag.id;
                }

                await tx.insert(contactTag).values({
                    contactId: id,
                    tagId
                });
            }
        }

        return id;
    });

    // Generate assets after transaction
    // Generate assets after transaction
    let origin: string | undefined;
    try {
        origin = getRequestEvent()?.url.origin;
    } catch (e) { /* ignore */ }
    await generateContactAssets(contactId, origin);

    return contactId;
}

/**
 * Update an existing contact
 */
export async function updateContact(id: string, data: Partial<ContactData>) {
    const user = getAuthenticatedUser();
    ensureAccess(user, 'contacts');



    const isAdmin = parseRoles(user).includes('admin');

    await db.transaction(async (tx) => {


        // Update main contact
        if (data.contact) {

            const updateSet: any = {
                updatedAt: new Date()
            };
            if (data.contact.displayName !== undefined) updateSet.displayName = data.contact.displayName;
            if (data.contact.givenName !== undefined) updateSet.givenName = data.contact.givenName;
            if (data.contact.familyName !== undefined) updateSet.familyName = data.contact.familyName;
            if (data.contact.middleName !== undefined) updateSet.middleName = data.contact.middleName;
            if (data.contact.honorificPrefix !== undefined) updateSet.honorificPrefix = data.contact.honorificPrefix;
            if (data.contact.honorificSuffix !== undefined) updateSet.honorificSuffix = data.contact.honorificSuffix;
            if (data.contact.birthday !== undefined) updateSet.birthday = data.contact.birthday;
            if (data.contact.gender !== undefined) updateSet.gender = data.contact.gender;
            if (data.contact.notes !== undefined) updateSet.notes = data.contact.notes;
            if (data.contact.isPublic !== undefined) updateSet.isPublic = data.contact.isPublic;

            const query = tx.update(contact).set(updateSet);
            await query.where(eq(contact.id, id));
        }


        // Surgical update for related fields


        // Emails
        if (data.emails !== undefined) {

            await tx.delete(contactEmail).where(eq(contactEmail.contactId, id));

            if (data.emails.length > 0) {
                await tx.insert(contactEmail).values(
                    data.emails.map(e => ({
                        contactId: id,
                        value: e.value,
                        type: e.type || 'other',
                        primary: !!e.primary
                    }))
                );
            }
        }

        // Phones
        if (data.phones !== undefined) {

            await tx.delete(contactPhone).where(eq(contactPhone.contactId, id));

            if (data.phones.length > 0) {
                await tx.insert(contactPhone).values(
                    data.phones.map(p => ({
                        contactId: id,
                        value: p.value,
                        type: p.type || 'other',
                        primary: !!p.primary
                    }))
                );
            }
        }

        // Addresses
        if (data.addresses !== undefined) {

            // Addresses are harder to diff by value, so we'll stick to delete-reinsert but only if they changed
            await tx.delete(contactAddress).where(eq(contactAddress.contactId, id));
            const targetAddresses = data.addresses || [];
            if (targetAddresses.length > 0) {
                await tx.insert(contactAddress).values(
                    targetAddresses.map(a => ({
                        contactId: id,
                        street: a.street || null,
                        houseNumber: a.houseNumber || null,
                        addressSuffix: a.addressSuffix || null,
                        zip: a.zip || null,
                        city: a.city || null,
                        state: a.state || null,
                        country: a.country || null,
                        type: a.type || 'other',
                        primary: !!a.primary
                    }))
                );
            }
        }

        // Relations
        if (data.relationIds !== undefined) {

            const currentRelations = await tx.select().from(contactRelation).where(eq(contactRelation.contactId, id));
            const currentTargetIds = currentRelations.map(r => r.targetContactId);

            const targetRelationIds = data.relationIds || [];
            const targetIds = targetRelationIds.map(r => r.targetContactId);

            const toDelete = currentRelations.filter(r => !targetIds.includes(r.targetContactId));
            if (toDelete.length > 0) {
                await tx.delete(contactRelation).where(and(
                    eq(contactRelation.contactId, id),
                    inArray(contactRelation.targetContactId, toDelete.map(r => r.targetContactId))
                ));
            }

            const toAdd = targetRelationIds.filter(r => !currentTargetIds.includes(r.targetContactId));
            if (toAdd.length > 0) {
                await tx.insert(contactRelation).values(
                    toAdd.map(r => ({
                        contactId: id,
                        targetContactId: r.targetContactId,
                        relationType: r.relationType
                    }))
                );
            }
        }

        // Tags
        if (data.tagNames !== undefined) {

            const currentTagAssociations = await tx.query.contactTag.findMany({
                where: (ct, { eq }) => eq(ct.contactId, id),
                with: { tag: true }
            });
            const currentTagNames = currentTagAssociations.map(ct => ct.tag.name);
            const targetTagNames = data.tagNames || [];

            // Delete removed tags
            const toRemove = currentTagAssociations.filter(ct => !targetTagNames.includes(ct.tag.name));
            if (toRemove.length > 0) {
                await tx.delete(contactTag).where(and(
                    eq(contactTag.contactId, id),
                    inArray(contactTag.tagId, toRemove.map(ct => ct.tagId))
                ));
            }

            // Add new tags
            const toAdd = targetTagNames.filter(name => !currentTagNames.includes(name));
            for (const tagName of toAdd) {
                let tagId: string;
                const existingTag = await tx.query.tag.findFirst({
                    where: (t, { eq }) => eq(t.name, tagName)
                });

                if (existingTag) {
                    tagId = existingTag.id;
                } else {
                    const [newTag] = await tx.insert(tag).values({
                        name: tagName,
                        userId: user.id
                    }).returning({ id: tag.id });
                    tagId = newTag.id;
                }

                await tx.insert(contactTag).values({
                    contactId: id,
                    tagId
                });
            }
        }

    });

    // Re-generate assets
    // Re-generate assets
    let origin: string | undefined;
    try {
        origin = getRequestEvent()?.url.origin;
    } catch (e) { /* ignore */ }
    await generateContactAssets(id, origin);

    return id;
}

/**
 * Delete a contact and all its associations
 */
export async function deleteContact(id: string) {
    const user = getAuthenticatedUser();
    ensureAccess(user, 'contacts');

    // Clean up files if we have the URLs
    const data = await db.query.contact.findFirst({
        where: (table, { eq }) => eq(table.id, id)
    });

    if (data) {
        const storage = getStorageProvider();
        if (data.vCardPath) await storage.delete(data.vCardPath);
        if (data.qrCodePath) await storage.delete(data.qrCodePath);
    }

    return await db.delete(contact)
        .where(eq(contact.id, id));
}

/**
 * Associate a contact with an entity (user, location, resource, event)
 */
export async function associateContact(type: 'user' | 'location' | 'resource' | 'event' | 'announcement', entityId: string, contactId: string) {
    const user = getAuthenticatedUser();

    // Allow users with 'contacts' access OR 'events' access if associating with an event
    if (!hasAccess(user, 'contacts') && !(type === 'event' && hasAccess(user, 'events')) && !(type === 'announcement' && hasAccess(user, 'announcements'))) {
        throw new Error('Forbidden');
    }

    const table = {
        user: userContact,
        location: locationContact,
        resource: resourceContact,
        event: eventContact,
        announcement: announcementContact
    }[type];

    const entityField = {
        user: 'userId',
        location: 'locationId',
        resource: 'resourceId',
        event: 'eventId',
        announcement: 'announcementId'
    }[type];

    await (db.insert(table) as any).values({
        [entityField]: entityId,
        contactId
    }).onConflictDoNothing();
}

/**
 * Read a single contact by ID
 */
export async function getContact(id: string) {
    const contactRecord = await db.query.contact.findFirst({
        where: (table, { eq }) => eq(table.id, id),
        with: {
            emails: true,
            phones: true,
            addresses: true,
            relations: {
                with: {
                    targetContact: true
                }
            },
            tags: {
                with: {
                    tag: true
                }
            }
        }
    });

    if (!contactRecord) return null;

    return contactRecord;

    return contactRecord;
}

/**
 * Dissociate a contact from an entity
 */
export async function dissociateContact(type: 'user' | 'location' | 'resource' | 'event' | 'announcement', entityId: string, contactId: string) {
    const user = getAuthenticatedUser();

    // Allow users with 'contacts' access OR 'events' access if dissociating from an event
    if (!hasAccess(user, 'contacts') && !(type === 'event' && hasAccess(user, 'events')) && !(type === 'announcement' && hasAccess(user, 'announcements'))) {
        throw new Error('Forbidden');
    }

    const table = {
        user: userContact,
        location: locationContact,
        resource: resourceContact,
        event: eventContact,
        announcement: announcementContact
    }[type];

    const entityField = {
        user: 'userId',
        location: 'locationId',
        resource: 'resourceId',
        event: 'eventId',
        announcement: 'announcementId'
    }[type];

    await db.delete(table).where(and(
        eq((table as any)[entityField], entityId),
        eq(table.contactId, contactId)
    ));
}

/**
 * Get all contacts associated with a specific entity
 */
export async function getEntityContacts(type: 'user' | 'location' | 'resource' | 'event' | 'announcement', entityId: string, skipAccessControl: boolean = false) {
    if (!skipAccessControl) {
        const user = getAuthenticatedUser();

        // Allow users with 'contacts' access OR 'events' access if fetching event contacts
        if (!hasAccess(user, 'contacts') && !(type === 'event' && hasAccess(user, 'events')) && !(type === 'announcement' && hasAccess(user, 'announcements'))) {
            throw new Error('Forbidden');
        }
    }

    const tableName = {
        user: 'userContact',
        location: 'locationContact',
        resource: 'resourceContact',
        event: 'eventContact',
        announcement: 'announcementContact'
    }[type];

    const entityField = {
        user: 'userId',
        location: 'locationId',
        resource: 'resourceId',
        event: 'eventId',
        announcement: 'announcementId'
    }[type];

    // Wait, let's check contacts-schema.ts for userContact
    // userContact = pgTable('userContact', {
    //   userId: uuid('userId').notNull().references(() => users.id, { onDelete: 'cascade' }),
    //   contactId: uuid('contactId').notNull().references(() => contact.id, { onDelete: 'cascade' }),
    // }, ...

    // Actually, 'userId' in userContact is the entity it's associated with.
    // BUT there is also contact.userId which is the owner.
    // This might be confusing.

    const associations = await (db.query as any)[tableName].findMany({
        where: (t: any, { eq }: any) => eq(t[entityField], entityId),
        with: {
            contact: {
                with: {
                    emails: true,
                    phones: true,
                    addresses: true,
                    tags: {
                        with: {
                            tag: true
                        }
                    },
                    relations: {
                        with: {
                            targetContact: true
                        }
                    }
                }
            }
        }
    });

    return associations.map((a: any) => ({
        ...a.contact,
        participationStatus: a.participationStatus || 'needsAction'
    }));
}

/**
 * Update metadata (like participation status) for an association
 */
export async function updateAssociationStatus(type: 'event', entityId: string, contactId: string, status: string) {
    const user = getAuthenticatedUser();

    // Allow users with either 'contacts' or the respective entity's access
    if (!hasAccess(user, 'contacts') && !hasAccess(user, 'events')) {
        throw new Error('Forbidden');
    }

    if (type !== 'event') {
        throw new Error('Only event associations support participation status');
    }

    const result = await db.update(eventContact)
        .set({ participationStatus: status })
        .where(and(
            eq(eventContact.eventId, entityId),
            eq(eventContact.contactId, contactId)
        ))
        .returning();


}

