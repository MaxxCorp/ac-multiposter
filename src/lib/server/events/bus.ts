
import { qstash, publishJSON } from '$lib/server/qstash';
import { db } from '$lib/server/db';
import {
    event as eventTable,
    eventResource as eventResourceTable,
    eventContact as eventContactTable,
    contact as contactTable,
    contactEmail as contactEmailTable,
    contactPhone as contactPhoneTable,
} from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';
import { env } from '$env/dynamic/private';

const BASE_URL = env.BETTER_AUTH_URL || 'http://localhost:5173';

export type EventChangeType = 'CREATE' | 'UPDATE' | 'DELETE';

/**
 * Publish an event change to the Enterprise Event Bus
 */
export async function publishEventChange(eventId: string, type: EventChangeType) {
    try {
        let eventData = null;

        // For CREATE and UPDATE, fetch the full event data
        if (type !== 'DELETE') {
            // Fetch event details
            const [eventRow] = await db
                .select()
                .from(eventTable)
                .where(eq(eventTable.id, eventId));

            if (eventRow) {
                // Fetch related resources and contacts
                const resources = await db
                    .select({ id: eventResourceTable.resourceId })
                    .from(eventResourceTable)
                    .where(eq(eventResourceTable.eventId, eventId));

                const contacts = await db
                    .select({
                        id: eventContactTable.contactId,
                        displayName: contactTable.displayName,
                        givenName: contactTable.givenName,
                        familyName: contactTable.familyName,
                        qrCodePath: contactTable.qrCodePath,
                    })
                    .from(eventContactTable)
                    .innerJoin(contactTable, eq(eventContactTable.contactId, contactTable.id))
                    .where(eq(eventContactTable.eventId, eventId));

                // Resolve primary contact details
                let resolvedContact = null;
                if (contacts.length > 0) {
                    const primaryContact = contacts[0];

                    const [email] = await db
                        .select({ value: contactEmailTable.value })
                        .from(contactEmailTable)
                        .where(and(
                            eq(contactEmailTable.contactId, primaryContact.id),
                            eq(contactEmailTable.primary, true)
                        ))
                        .limit(1);

                    const [phone] = await db
                        .select({ value: contactPhoneTable.value })
                        .from(contactPhoneTable)
                        .where(and(
                            eq(contactPhoneTable.contactId, primaryContact.id),
                            eq(contactPhoneTable.primary, true)
                        ))
                        .limit(1);

                    resolvedContact = {
                        name: primaryContact.displayName || `${primaryContact.givenName || ''} ${primaryContact.familyName || ''}`.trim(),
                        email: email?.value || '',
                        phone: phone?.value || '',
                        qrCodeDataUrl: primaryContact.qrCodePath ? `${BASE_URL}${primaryContact.qrCodePath}` : undefined
                    };
                }

                // Construct full event object, expanding relative paths to absolute URLs
                eventData = {
                    ...eventRow,
                    createdAt: eventRow.createdAt.toISOString(),
                    updatedAt: eventRow.updatedAt.toISOString(),
                    startDateTime: eventRow.startDateTime?.toISOString() ?? null,
                    endDateTime: eventRow.endDateTime?.toISOString() ?? null,
                    qrCodePath: eventRow.qrCodePath ? `${BASE_URL}${eventRow.qrCodePath}` : null,
                    iCalPath: eventRow.iCalPath ? `${BASE_URL}${eventRow.iCalPath}` : null,
                    resourceIds: resources.map(r => r.id),
                    contactIds: contacts.map(c => c.id),
                    resolvedContact,
                };
            }
        }

        // Construct Payload
        const payload = {
            type,
            timestamp: new Date().toISOString(),
            eventId,
            baseUrl: BASE_URL,
            data: eventData
        };

        // Destination: In a real enterprise app, this would be a fan-out topic.
        // For now, we publish to our own incoming consumer endpoint via QStash.
        // The consumer endpoint is typically public, or reachable by QStash.
        // If we are on localhost, QStash CANNOT reach us unless we use a tunnel (like ngrok).
        // Since the user asked to implement "as standardized enterprise event bus", we assume they might testing in an environment where this works 
        // OR they accept that local testing requires a tunnel or simply validating the QStash call.
        // Given the constraints, I will assume BASE_URL is reachable or they will use a tunnel.

        const consumerUrl = `${BASE_URL}/api/bus/incoming`;

        console.log(`[EventBus] Publishing ${type} for ${eventId} to ${consumerUrl}`);

        const result = await publishJSON(consumerUrl, payload);
        return result;

    } catch (error) {
        console.error(`[EventBus] Failed to publish event change:`, error);
        return { success: false, error: error };
    }
}
