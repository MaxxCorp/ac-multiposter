import { query } from '$app/server';
import { db } from '$lib/server/db';
import { eq, and, or, gte, desc, isNull, inArray, ilike } from 'drizzle-orm';
import { event, eventContact, contact, contactEmail, contactPhone, contactAddress, eventResource, resource, location, kiosk, kioskLocation, eventLocation } from '$lib/server/db/schema';
import * as v from 'valibot';
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

export const listPublicEvents = query(async (): Promise<PublicEvent[]> => {
    const now = new Date();
    const today = now.toISOString().split('T')[0];

    const results = await db
        .select()
        .from(event)
        .where(
            and(
                eq(event.isPublic, true),
                or(
                    gte(event.endDateTime, now),
                    and(
                        isNull(event.endDateTime),
                        gte(event.endDate, today)
                    )
                )
            )
        )
        .orderBy(desc(event.startDateTime), desc(event.startDate));

    if (results.length === 0) return [];

    // We can reuse the hydration logic function if I extract it, but I'll duplicate inline to keep it simple as before.
    return hydrateEvents(results);
});

export const listKioskEvents = query(v.string(), async (kioskId: string): Promise<PublicEvent[]> => {
    // 1. Fetch Kiosk and its Locations
    const kioskData = await db.query.kiosk.findFirst({
        where: eq(kiosk.id, kioskId),
    });

    if (!kioskData) return [];

    const kioskLocations = await db
        .select({ id: kioskLocation.locationId })
        .from(kioskLocation)
        .where(eq(kioskLocation.kioskId, kioskId));

    const kioskLocationIds = kioskLocations.map(l => l.id);

    const now = new Date();
    const lookPastDate = new Date(now.getTime() - (kioskData.lookPast * 1000));
    const lookPastDateStr = lookPastDate.toISOString().split('T')[0];

    // 2. Build Filter Criteria
    const conditions = [
        eq(event.isPublic, true),
        or(
            gte(event.endDateTime, lookPastDate),
            and(
                isNull(event.endDateTime),
                gte(event.endDate, lookPastDateStr)
            )
        )
    ];

    // 3. Apply Location Filtering if Kiosk has locations
    if (kioskLocationIds.length > 0) {
        conditions.push(or(
            // Event matches one of the kiosk locations via join table
            inArray(
                event.id,
                db.select({ eventId: eventLocation.eventId })
                    .from(eventLocation)
                    .where(inArray(eventLocation.locationId, kioskLocationIds))
            ),
            // Resource matches one of the kiosk locations
            inArray(
                event.id,
                db.select({ eventId: eventResource.eventId })
                    .from(eventResource)
                    .innerJoin(resource, eq(eventResource.resourceId, resource.id))
                    .where(inArray(resource.locationId, kioskLocationIds))
            ),
            // Fallback: Location Name text match (optional, can remove if strictly ID based now)
            // Keeping it simple: removed legacy text match to enforce strict ID linking, 
            // or we need to fetch location names to do ilike.
        ));
    }

    const results = await db
        .selectDistinct({ id: event.id })
        .from(event)
        .where(and(...conditions));

    if (results.length === 0) return [];

    const eventIds = results.map(e => e.id);
    const fullEvents = await db
        .select()
        .from(event)
        .where(inArray(event.id, eventIds))
        .orderBy(desc(event.startDateTime), desc(event.startDate));

    return hydrateEvents(fullEvents);
});

// Helper for data hydration to stay DRY
async function hydrateEvents(events: any[]): Promise<PublicEvent[]> {
    const eventIds = events.map(e => e.id);
    if (eventIds.length === 0) return [];

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

    let emails: any[] = [];
    let phones: any[] = [];
    let addresses: any[] = [];

    if (contactIds.length > 0) {
        emails = await db.select({ contactId: contactEmail.contactId, value: contactEmail.value, type: contactEmail.type, primary: contactEmail.primary })
            .from(contactEmail).where(inArray(contactEmail.contactId, contactIds));
        phones = await db.select({ contactId: contactPhone.contactId, value: contactPhone.value, type: contactPhone.type, primary: contactPhone.primary })
            .from(contactPhone).where(inArray(contactPhone.contactId, contactIds));
        addresses = await db.select().from(contactAddress).where(inArray(contactAddress.contactId, contactIds));
    }

    return events.map(row => {
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
            ticketPrice: row.ticketPrice ?? null,
            categoryBerlinDotDe: row.categoryBerlinDotDe ?? null,
            qrCodeDataUrl: undefined,
            confirmedParticipants: 0,
            maxOccupancy: null,
            inclusivityInformation: undefined
        };

        const evtContacts = contactsData.filter(c => c.eventId === row.id);
        const acceptedCount = evtContacts.filter(c => c.participationStatus === 'accepted').length;

        let resolvedContact = null;
        if (evtContacts.length > 0) {
            const primary = evtContacts[0];
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

        const evtResources = resourceData.filter(r => r.eventId === row.id);
        const totalCapacity = evtResources.reduce((sum, r) => sum + (r.maxOccupancy || 0), 0);
        const inclusivity = evtResources
            .map(r => r.inclusivitySupport)
            .filter((i): i is string => !!i);

        return {
            ...transformedRow,
            resolvedContact,
            contactIds: evtContacts.map(c => c.contactId),
            confirmedParticipants: acceptedCount,
            maxOccupancy: totalCapacity > 0 ? totalCapacity : null,
            inclusivityInformation: inclusivity.length > 0 ? [...new Set(inclusivity)] : undefined
        };
    });
}
