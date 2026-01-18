import { query } from '$app/server';
import { db } from '$lib/server/db';
import { eq, and, or, gte, desc, isNull, inArray, sql } from 'drizzle-orm';
import { eventContact, contact, contactEmail, contactPhone, contactAddress, eventResource, resource, location } from '$lib/server/db/schema';
import { event } from '$lib/server/db/schema';

/**
 * Extended Event interface for Public/Kiosk display with richer contact details
 */
import type { Event } from './list.remote';

export type PublicEvent = Omit<Event, 'resolvedContact'> & {
    resolvedContact: {
        name: string;
        emails: { value: string; type: string | null; primary: boolean }[];
        phones: { value: string; type: string | null; primary: boolean }[];
        address: {
            street: string | null;
            houseNumber: string | null;
            zip: string | null;
            city: string | null;
            country: string | null;
        } | null;
        qrCodeDataUrl?: string;
    } | null;
    ticketPrice?: string | null;
    categoryBerlinDotDe?: string | null;
    qrCodeDataUrl?: string;
    confirmedParticipants?: number;
    maxOccupancy?: number | null;
    inclusivityInformation?: string[];
};

/**
 * List all public upcoming and current events.
 * This function bypasses user authentication checks and strictly filters for public events.
 */
export const listPublicEvents = query(async (): Promise<PublicEvent[]> => {
    const now = new Date();
    const today = now.toISOString().split('T')[0]; // YYYY-MM-DD

    const results = await db
        .select()
        .from(event)
        .where(
            and(
                eq(event.isPublic, true),
                or(
                    // If endDateTime exists, it must be in the future
                    gte(event.endDateTime, now),
                    // If endDateTime is null, check endDate (all-day events)
                    and(
                        isNull(event.endDateTime),
                        gte(event.endDate, today)
                    )
                )
            )
        )
        .orderBy(desc(event.startDateTime), desc(event.startDate));

    if (results.length === 0) return [];

    const eventIds = results.map(e => e.id);

    // 1. Fetch Capacity & Inclusivity (Event -> Resource -> Location)
    const resourceData = await db
        .select({
            eventId: eventResource.eventId,
            maxOccupancy: resource.maxOccupancy,
            inclusivitySupport: location.inclusivitySupport,
            locationId: location.id
        })
        .from(eventResource)
        .innerJoin(resource, eq(eventResource.resourceId, resource.id))
        .leftJoin(location, eq(resource.locationId, location.id))
        .where(inArray(eventResource.eventId, eventIds));

    // 2. Fetch Contacts & Participants
    const contactsData = await db
        .select({
            eventId: eventContact.eventId,
            contactId: eventContact.contactId,
            participationStatus: eventContact.participationStatus,
            displayName: contact.displayName,
            givenName: contact.givenName,
            familyName: contact.familyName,
            qrCodePath: contact.qrCodePath,
        })
        .from(eventContact)
        .innerJoin(contact, eq(eventContact.contactId, contact.id))
        .where(inArray(eventContact.eventId, eventIds));

    const contactIds = contactsData.map(c => c.contactId);

    // 3. Fetch Contact Address/Email/Phone (for 'work' filtering)
    let emails: any[] = [];
    let phones: any[] = [];
    let addresses: any[] = [];

    if (contactIds.length > 0) {
        emails = await db.select({ contactId: contactEmail.contactId, value: contactEmail.value, type: contactEmail.type, primary: contactEmail.primary })
            .from(contactEmail)
            .where(inArray(contactEmail.contactId, contactIds));

        phones = await db.select({ contactId: contactPhone.contactId, value: contactPhone.value, type: contactPhone.type, primary: contactPhone.primary })
            .from(contactPhone)
            .where(inArray(contactPhone.contactId, contactIds));

        addresses = await db.select()
            .from(contactAddress)
            .where(inArray(contactAddress.contactId, contactIds));
    }

    // Transform and map
    return results.map(row => {
        // --- Transform Dates ---
        const transformedRow = {
            ...row,
            createdAt: row.createdAt.toISOString(),
            updatedAt: row.updatedAt.toISOString(),
            startDateTime: row.startDateTime?.toISOString() ?? null,
            endDateTime: row.endDateTime?.toISOString() ?? null,
            resourceIds: [],
            contactIds: [],
            participationStatuses: {},
            resolvedContact: null,
            ticketPrice: row.ticketPrice ?? null, // Ensure explicit null
            categoryBerlinDotDe: row.categoryBerlinDotDe ?? null, // Ensure explicit null
            qrCodeDataUrl: undefined,
            confirmedParticipants: 0,
            maxOccupancy: null,
            inclusivityInformation: undefined
        };

        // --- Participation & Contact Person ---
        const evtContacts = contactsData.filter(c => c.eventId === row.id);
        const acceptedCount = evtContacts.filter(c => c.participationStatus === 'accepted').length;

        let resolvedContact = null;
        if (evtContacts.length > 0) {
            const primary = evtContacts[0];

            // Strictly filter for WORK details
            const workEmails = emails.filter(e => e.contactId === primary.contactId && e.type === 'work');
            const workPhones = phones.filter(p => p.contactId === primary.contactId && p.type === 'work');
            const workAddresses = addresses.filter(a => a.contactId === primary.contactId && a.type === 'work');

            const primaryAddress = workAddresses.find(a => a.primary) || workAddresses[0];

            resolvedContact = {
                name: primary.displayName || `${primary.givenName || ''} ${primary.familyName || ''}`.trim(),
                emails: workEmails.map(e => ({ value: e.value, type: e.type, primary: e.primary })),
                phones: workPhones.map(p => ({ value: p.value, type: p.type, primary: p.primary })),
                address: primaryAddress ? {
                    street: primaryAddress.street,
                    houseNumber: primaryAddress.houseNumber,
                    zip: primaryAddress.zip,
                    city: primaryAddress.city,
                    country: primaryAddress.country
                } : null,
                qrCodeDataUrl: primary.qrCodePath || undefined
            };
        }

        // --- Capacity & Inclusivity ---
        const evtResources = resourceData.filter(r => r.eventId === row.id);
        const totalCapacity = evtResources.reduce((sum, r) => sum + (r.maxOccupancy || 0), 0);
        const inclusivity = evtResources
            .map(r => r.inclusivitySupport)
            .filter((i): i is string => !!i);

        return {
            ...transformedRow,
            resolvedContact,
            contactIds: evtContacts.map(c => c.contactId), // Just IDs
            confirmedParticipants: acceptedCount,
            maxOccupancy: totalCapacity > 0 ? totalCapacity : null,
            inclusivityInformation: inclusivity.length > 0 ? [...new Set(inclusivity)] : undefined
        };
    });
});
