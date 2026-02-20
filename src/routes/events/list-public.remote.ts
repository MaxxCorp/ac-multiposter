import { query } from '$app/server';
import { db } from '$lib/server/db';
import { eq, and, or, gte, desc, isNull, inArray, ilike } from 'drizzle-orm';
import { event, eventContact, contact, contactEmail, contactPhone, contactAddress, eventResource, resource, location, kiosk, kioskLocation, eventLocation, contactTag, tag, locationContact } from '$lib/server/db/schema';
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
                gte(event.endDateTime, now)
            )
        )
        .orderBy(desc(event.startDateTime));

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
        gte(event.endDateTime, lookPastDate)
    ];

    // 3. Apply Location Filtering if Kiosk has locations
    if (kioskLocationIds.length > 0) {
        const locCondition = or(
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
            )
        );
        if (locCondition) {
            conditions.push(locCondition);
        }
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
        .orderBy(desc(event.startDateTime));

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

    // Fetch direct locations (new multi-location support)
    const directLocationData = await db
        .select({
            eventId: eventLocation.eventId,
            locationId: eventLocation.locationId
        })
        .from(eventLocation)
        .where(inArray(eventLocation.eventId, eventIds));

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

    // Fetch tags for event contacts to identify 'Employee'
    let contactEmployeeTags = new Set<string>();
    if (contactIds.length > 0) {
        const tags = await db.select({ contactId: contactTag.contactId })
            .from(contactTag)
            .innerJoin(tag, eq(contactTag.tagId, tag.id))
            .where(and(
                inArray(contactTag.contactId, contactIds),
                eq(tag.name, 'Employee')
            ));
        tags.forEach(t => contactEmployeeTags.add(t.contactId));
    }

    // Collect all location IDs (from resources and direct assignment)
    const allLocationIds = new Set<string>();
    resourceData.forEach(r => { if (r.locationId) allLocationIds.add(r.locationId); });
    directLocationData.forEach(l => allLocationIds.add(l.locationId));

    // Fetch 'Employee' contacts for these locations
    const locationEmployeeContacts: Record<string, string> = {}; // locationId -> contactId (first found)
    if (allLocationIds.size > 0) {
        const locIdsArr = Array.from(allLocationIds);
        const locContacts = await db
            .select({
                locationId: locationContact.locationId,
                contactId: locationContact.contactId
            })
            .from(locationContact)
            .innerJoin(contactTag, eq(locationContact.contactId, contactTag.contactId))
            .innerJoin(tag, eq(contactTag.tagId, tag.id))
            .where(and(
                inArray(locationContact.locationId, locIdsArr),
                eq(tag.name, 'Employee')
            ));

        // Map first employee contact per location
        for (const lc of locContacts) {
            if (!locationEmployeeContacts[lc.locationId]) {
                locationEmployeeContacts[lc.locationId] = lc.contactId;
            }
        }
    }

    // Capture IDs of location contacts to fetch their details if not already fetched
    const extraContactIds = Object.values(locationEmployeeContacts).filter(id => !contactIds.includes(id));
    const allContactIdsToFetch = [...contactIds, ...extraContactIds];

    let emails: any[] = [];
    let phones: any[] = [];
    let addresses: any[] = [];
    let extraContactDetails: any[] = [];

    if (allContactIdsToFetch.length > 0) {
        emails = await db.select({ contactId: contactEmail.contactId, value: contactEmail.value, type: contactEmail.type, primary: contactEmail.primary })
            .from(contactEmail).where(inArray(contactEmail.contactId, allContactIdsToFetch));
        phones = await db.select({ contactId: contactPhone.contactId, value: contactPhone.value, type: contactPhone.type, primary: contactPhone.primary })
            .from(contactPhone).where(inArray(contactPhone.contactId, allContactIdsToFetch));
        addresses = await db.select().from(contactAddress).where(inArray(contactAddress.contactId, allContactIdsToFetch));

        if (extraContactIds.length > 0) {
            extraContactDetails = await db.select({
                id: contact.id,
                displayName: contact.displayName,
                givenName: contact.givenName,
                familyName: contact.familyName,
                qrCodePath: contact.qrCodePath,
            }).from(contact).where(inArray(contact.id, extraContactIds));
        }
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

        // Resolve Display Contact
        let chosenContactId: string | null = null;
        let chosenContactDetails: any = null;

        // 1. Event Contact with 'Employee' tag
        const employeeContact = evtContacts.find(c => contactEmployeeTags.has(c.contactId));
        if (employeeContact) {
            chosenContactId = employeeContact.contactId;
            chosenContactDetails = employeeContact;
        }

        // 2. Location Contact with 'Employee' tag
        if (!chosenContactId) {
            // Get locations for this event
            const evtLocIds = [
                ...resourceData.filter(r => r.eventId === row.id && r.locationId).map(r => r.locationId!),
                ...directLocationData.filter(l => l.eventId === row.id).map(l => l.locationId)
            ];

            for (const locId of evtLocIds) {
                if (locationEmployeeContacts[locId]) {
                    chosenContactId = locationEmployeeContacts[locId];
                    // Find details
                    chosenContactDetails = evtContacts.find(c => c.contactId === chosenContactId)
                        || extraContactDetails.find(c => c.id === chosenContactId);
                    if (chosenContactDetails) break;
                }
            }
        }

        // 3. Fallback: First Event Contact
        if (!chosenContactId && evtContacts.length > 0) {
            chosenContactId = evtContacts[0].contactId;
            chosenContactDetails = evtContacts[0];
        }

        let resolvedContact = null;
        if (chosenContactId && chosenContactDetails) {
            const primaryAddress = addresses.filter(a => a.contactId === chosenContactId && a.type === 'work').find(a => a.primary) || addresses.filter(a => a.contactId === chosenContactId && a.type === 'work')[0];
            const workEmails = emails.filter(e => e.contactId === chosenContactId && e.type === 'work');
            const workPhones = phones.filter(p => p.contactId === chosenContactId && p.type === 'work');

            resolvedContact = {
                name: chosenContactDetails.displayName || `${chosenContactDetails.givenName || ''} ${chosenContactDetails.familyName || ''}`.trim(),
                emails: workEmails.map(e => ({ value: e.value, type: e.type, primary: e.primary })),
                phones: workPhones.map(p => ({ value: p.value, type: p.type, primary: p.primary })),
                address: primaryAddress ? {
                    street: primaryAddress.street,
                    houseNumber: primaryAddress.houseNumber,
                    zip: primaryAddress.zip,
                    city: primaryAddress.city,
                    country: primaryAddress.country
                } : null,
                qrCodeDataUrl: chosenContactDetails.qrCodePath || undefined
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
