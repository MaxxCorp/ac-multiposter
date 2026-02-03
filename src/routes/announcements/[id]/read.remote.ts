import { query } from '$app/server';
import { db } from '$lib/server/db';
import { announcement, announcementTag, announcementContact, tag, announcementLocation, contact, contactEmail, contactPhone, contactTag, locationContact } from '$lib/server/db/schema';
import { eq, and, inArray } from 'drizzle-orm';
import type { Announcement } from '../list.remote';
import { getAuthenticatedUser, ensureAccess } from '$lib/authorization';
import * as v from 'valibot';

import { getRequestEvent } from '$app/server';

/**
 * Query: Read an announcement by ID
 */
export const readAnnouncement = query(v.string(), async (announcementId: string): Promise<Announcement | null> => {
    const event = getRequestEvent();
    const user = event.locals.user;


    const [result] = await db
        .select()
        .from(announcement)
        .where(and(
            eq(announcement.id, announcementId),
        ));

    if (!result) return null;

    if (!result.isPublic) {
        if (!user) throw new Error('Unauthorized');
        ensureAccess(user, 'announcements');
    }

    // Fetch related tags and contacts
    // Fetch related tags and contacts
    const tags = await db
        .select({ id: announcementTag.tagId, name: tag.name })
        .from(announcementTag)
        .leftJoin(tag, eq(announcementTag.tagId, tag.id))
        .where(eq(announcementTag.announcementId, announcementId));

    const contacts = await db
        .select({ id: announcementContact.contactId })
        .from(announcementContact)
        .where(eq(announcementContact.announcementId, announcementId));

    // Fetch related locations
    const locations = await db
        .select({ id: announcementLocation.locationId })
        .from(announcementLocation)
        .where(eq(announcementLocation.announcementId, announcementId));

    // Resolve primary contact details
    let resolvedContact = null;

    // Helper to fetch full contact info
    const fetchContactInfo = async (contactId: string) => {
        const [c] = await db.select().from(contact).where(eq(contact.id, contactId));
        if (!c) return null;

        const [email] = await db
            .select({ value: contactEmail.value })
            .from(contactEmail)
            .where(and(eq(contactEmail.contactId, contactId), eq(contactEmail.primary, true)))
            .limit(1);

        const [phone] = await db
            .select({ value: contactPhone.value })
            .from(contactPhone)
            .where(and(eq(contactPhone.contactId, contactId), eq(contactPhone.primary, true)))
            .limit(1);

        return {
            name: c.displayName || `${c.givenName || ''} ${c.familyName || ''}`.trim(),
            email: email?.value || '',
            phone: phone?.value || '',
            qrCodeDataUrl: c.qrCodePath || undefined
        };
    };

    // 1. Check for Announcement Contact with 'Employee' tag
    let chosenContactId: string | null = null;

    // Fetch contacts with their tags
    const contactsWithTags = await db
        .select({
            contactId: announcementContact.contactId,
            tagName: tag.name
        })
        .from(announcementContact)
        .leftJoin(contactTag, eq(announcementContact.contactId, contactTag.contactId))
        .leftJoin(tag, eq(contactTag.tagId, tag.id))
        .where(eq(announcementContact.announcementId, announcementId));

    // Group tags by contact
    const contactTagsMap = new Map<string, string[]>();
    for (const row of contactsWithTags) {
        if (!contactTagsMap.has(row.contactId)) contactTagsMap.set(row.contactId, []);
        if (row.tagName) contactTagsMap.get(row.contactId)?.push(row.tagName);
    }

    // Find first contact with 'Employee' tag
    const employeeContact = Array.from(contactTagsMap.entries()).find(([_, tags]) => tags.includes('Employee'));
    if (employeeContact) {
        chosenContactId = employeeContact[0];
    }

    // 2. If no Announcement Employee Contact, check Location Employee Contacts
    if (!chosenContactId && locations.length > 0) {
        const locIds = locations.map(l => l.id);
        const locationContacts = await db
            .select({
                contactId: locationContact.contactId,
                tagName: tag.name
            })
            .from(locationContact)
            .leftJoin(contactTag, eq(locationContact.contactId, contactTag.contactId))
            .leftJoin(tag, eq(contactTag.tagId, tag.id))
            .where(inArray(locationContact.locationId, locIds));

        // Find first location contact with 'Employee' tag
        const locContact = locationContacts.find(row => row.tagName === 'Employee');
        if (locContact) {
            chosenContactId = locContact.contactId;
        }
    }

    // 3. Fallback: First announcement contact (if any)
    if (!chosenContactId && contacts.length > 0) {
        chosenContactId = contacts[0].id;
    }

    if (chosenContactId) {
        resolvedContact = await fetchContactInfo(chosenContactId);
    }

    return {
        ...result,
        createdAt: result.createdAt.toISOString(),
        updatedAt: result.updatedAt.toISOString(),
        tagIds: tags.map(t => t.id),
        tagNames: tags.map(t => t.name).filter(n => n !== null) as string[],
        contactIds: contacts.map(c => c.id),
        locationIds: locations.map(l => l.id),
        resolvedContact,
    } as Announcement;
});
