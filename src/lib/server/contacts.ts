import { db } from './db';
import {
    contact, contactEmail, contactPhone, contactAddress,
    userContact, locationContact, resourceContact, eventContact,
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

// Helper to generate IDs
const generateId = () => crypto.randomUUID();

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

    data.emails?.forEach(e => {
        const prop = card.addPropertyWithValue('email', e.value);
        if (e.type) prop.setParameter('type', e.type.toLowerCase());
    });

    data.phones?.forEach(p => {
        const prop = card.addPropertyWithValue('tel', p.value);
        if (p.type) prop.setParameter('type', p.type.toLowerCase());
    });

    data.addresses?.forEach(a => {
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

    const storage = getStorageProvider();
    const fullNameSlug = fullName.replace(/\s+/g, '_');

    const oldVCardPath = data.vCardPath;
    const oldQRCodePath = data.qrCodePath;

    // vCard Upload
    const vCardFileName = `contacts/${contactId}/${fullNameSlug}.vcf`;
    const vCardUrl = await storage.put(vCardFileName, card.toString(), 'text/vcard');

    // QR Code generation

    const baseUrl = env.PUBLIC_BASE_URL || origin || "";
    if (!baseUrl) {
        console.warn(`[Assets] No PUBLIC_BASE_URL or derivation origin found for contact ${contactId}. QR code will have relative URL.`);
    }
    const contactUrl = `${baseUrl}/contacts/${contactId}`;

    // Generate QR as Buffer
    const qrBuffer = await QRCode.toBuffer(contactUrl, {
        width: 300,
        margin: 2,
        color: {
            dark: '#1e40af', // blue-800
            light: '#ffffff'
        }
    });

    const qrCodeFileName = `contacts/${contactId}/qr.png`;
    const qrCodeUrl = await storage.put(qrCodeFileName, qrBuffer, 'image/png');

    // Update paths in DB
    await db.update(contact)
        .set({
            vCardPath: vCardUrl,
            qrCodePath: qrCodeUrl
        })
        .where(eq(contact.id, contactId));

    // Clean up old assets if paths changed
    if (oldVCardPath && oldVCardPath !== vCardUrl) {
        await storage.delete(oldVCardPath);
    }
    if (oldQRCodePath && oldQRCodePath !== qrCodeUrl) {
        await storage.delete(oldQRCodePath);
    }
}

export interface ContactData {
    contact: typeof contact.$inferInsert;
    emails?: (typeof contactEmail.$inferInsert)[];
    phones?: (typeof contactPhone.$inferInsert)[];
    addresses?: (typeof contactAddress.$inferInsert)[];
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
        const id = data.contact.id || generateId();

        // Insert main contact
        await tx.insert(contact).values({
            ...data.contact,
            id: id,
            userId: user.id
        });

        // Insert emails
        if (data.emails && data.emails.length > 0) {
            await tx.insert(contactEmail).values(
                data.emails.map(e => ({ ...e, id: e.id || generateId(), contactId: id }))
            );
        }

        // Insert phones
        if (data.phones && data.phones.length > 0) {
            await tx.insert(contactPhone).values(
                data.phones.map(p => ({ ...p, id: p.id || generateId(), contactId: id }))
            );
        }

        // Insert addresses
        if (data.addresses && data.addresses.length > 0) {
            await tx.insert(contactAddress).values(
                data.addresses.map(a => ({ ...a, id: a.id || generateId(), contactId: id }))
            );
        }

        // Insert relations
        if (data.relationIds && data.relationIds.length > 0) {
            await tx.insert(contactRelation).values(
                data.relationIds.map(r => ({
                    id: generateId(),
                    contactId: id,
                    targetContactId: r.targetContactId,
                    relationType: r.relationType
                }))
            );
        }

        // Insert tags
        if (data.tagNames && data.tagNames.length > 0) {
            for (const tagName of data.tagNames) {
                // Find or create tag
                let tagId: string;
                const existingTag = await tx.query.tag.findFirst({
                    where: (t, { and, eq }) => and(eq(t.userId, user.id), eq(t.name, tagName))
                });

                if (existingTag) {
                    tagId = existingTag.id;
                } else {
                    tagId = generateId();
                    await tx.insert(tag).values({
                        id: tagId,
                        name: tagName,
                        userId: user.id
                    });
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
            const updateSet = { ...data.contact, updatedAt: new Date() };
            const query = tx.update(contact).set(updateSet);

            if (isAdmin) {
                await query.where(eq(contact.id, id));
            } else {
                await query.where(and(eq(contact.id, id), eq(contact.userId, user.id)));
            }
        }

        // Replace related fields if provided (naive implementation: delete and re-insert)
        if (data.emails !== undefined) {
            await tx.delete(contactEmail).where(eq(contactEmail.contactId, id));
            if (data.emails.length > 0) {
                await tx.insert(contactEmail).values(
                    data.emails.map(e => ({ ...e, id: e.id || generateId(), contactId: id }))
                );
            }
        }

        if (data.phones !== undefined) {
            await tx.delete(contactPhone).where(eq(contactPhone.contactId, id));
            if (data.phones.length > 0) {
                await tx.insert(contactPhone).values(
                    data.phones.map(p => ({ ...p, id: p.id || generateId(), contactId: id }))
                );
            }
        }

        if (data.addresses !== undefined) {
            await tx.delete(contactAddress).where(eq(contactAddress.contactId, id));
            if (data.addresses.length > 0) {
                await tx.insert(contactAddress).values(
                    data.addresses.map(a => ({ ...a, id: a.id || generateId(), contactId: id }))
                );
            }
        }

        if (data.relationIds !== undefined) {
            await tx.delete(contactRelation).where(eq(contactRelation.contactId, id));
            if (data.relationIds.length > 0) {
                await tx.insert(contactRelation).values(
                    data.relationIds.map(r => ({
                        id: generateId(),
                        contactId: id,
                        targetContactId: r.targetContactId,
                        relationType: r.relationType
                    }))
                );
            }
        }

        if (data.tagNames !== undefined) {
            await tx.delete(contactTag).where(eq(contactTag.contactId, id));
            if (data.tagNames.length > 0) {
                for (const tagName of data.tagNames) {
                    let tagId: string;
                    const existingTag = await tx.query.tag.findFirst({
                        where: (t, { and, eq }) => and(eq(t.userId, user.id), eq(t.name, tagName))
                    });

                    if (existingTag) {
                        tagId = existingTag.id;
                    } else {
                        tagId = generateId();
                        await tx.insert(tag).values({
                            id: tagId,
                            name: tagName,
                            userId: user.id
                        });
                    }

                    await tx.insert(contactTag).values({
                        contactId: id,
                        tagId
                    });
                }
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
        .where(and(eq(contact.id, id), eq(contact.userId, user.id)));
}

/**
 * Associate a contact with an entity (user, location, resource, event)
 */
export async function associateContact(type: 'user' | 'location' | 'resource' | 'event', entityId: string, contactId: string) {
    const user = getAuthenticatedUser();

    // Allow users with 'contacts' access OR 'events' access if associating with an event
    if (!hasAccess(user, 'contacts') && !(type === 'event' && hasAccess(user, 'events'))) {
        throw new Error('Forbidden');
    }

    const table = {
        user: userContact,
        location: locationContact,
        resource: resourceContact,
        event: eventContact
    }[type];

    const entityField = {
        user: 'userId',
        location: 'locationId',
        resource: 'resourceId',
        event: 'eventId'
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

    const event = getRequestEvent();
    const user = event.locals.user as any;

    // Check if user is the owner, or an admin, or has full contacts feature access
    const isAuthorized = user && (
        contactRecord.userId === user.id ||
        parseRoles(user).includes('admin') ||
        hasAccess(user, 'contacts')
    );

    if (!isAuthorized) {
        if (!contactRecord.isPublic) {
            throw new Error('Forbidden: You do not have access to this contact');
        }
        // Publicly accessible, but strip sensitive data (relations)
        return {
            ...contactRecord,
            relations: []
        };
    }

    return contactRecord;
}

/**
 * Dissociate a contact from an entity
 */
export async function dissociateContact(type: 'user' | 'location' | 'resource' | 'event', entityId: string, contactId: string) {
    const user = getAuthenticatedUser();

    // Allow users with 'contacts' access OR 'events' access if dissociating from an event
    if (!hasAccess(user, 'contacts') && !(type === 'event' && hasAccess(user, 'events'))) {
        throw new Error('Forbidden');
    }

    const table = {
        user: userContact,
        location: locationContact,
        resource: resourceContact,
        event: eventContact
    }[type];

    const entityField = {
        user: 'userId',
        location: 'locationId',
        resource: 'resourceId',
        event: 'eventId'
    }[type];

    await db.delete(table).where(and(
        eq((table as any)[entityField], entityId),
        eq(table.contactId, contactId)
    ));
}

/**
 * Get all contacts associated with a specific entity
 */
export async function getEntityContacts(type: 'user' | 'location' | 'resource' | 'event', entityId: string) {
    const user = getAuthenticatedUser();

    // Allow users with 'contacts' access OR 'events' access if fetching event contacts
    if (!hasAccess(user, 'contacts') && !(type === 'event' && hasAccess(user, 'events'))) {
        throw new Error('Forbidden');
    }

    const tableName = {
        user: 'userContact',
        location: 'locationContact',
        resource: 'resourceContact',
        event: 'eventContact'
    }[type];

    const entityField = {
        user: 'userId',
        location: 'locationId',
        resource: 'resourceId',
        event: 'eventId'
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

    console.log(`[Contacts] Updating participation status for event ${entityId}, contact ${contactId} to ${status}`);

    const result = await db.update(eventContact)
        .set({ participationStatus: status })
        .where(and(
            eq(eventContact.eventId, entityId),
            eq(eventContact.contactId, contactId)
        ));

    // Note: Drizzle's update doesn't return the number of rows by default in all drivers, 
    // but we can check if it worked by querying if we really wanted to.
    // For now, we'll assume success if no error was thrown.
}
