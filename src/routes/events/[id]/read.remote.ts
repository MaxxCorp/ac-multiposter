import { query } from '$app/server';
import { db } from '$lib/server/db';
import { event, eventResource, eventContact, contact, contactEmail, contactPhone } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';
import type { Event } from '../list.remote';
import { getAuthenticatedUser, ensureAccess } from '$lib/authorization';
import * as v from 'valibot';

/**
 * Query: Read an event by ID
 * Note: Only allowing access to events owned by the user, or public events
 */
export const readEvent = query(v.string(), async (eventId: string): Promise<Event | null> => {
	const user = getAuthenticatedUser();
	ensureAccess(user, 'events');

	const [result] = await db
		.select()
		.from(event)
		.where(and(
			eq(event.id, eventId),
		));

	if (!result) return null;

	// Fetch related resources and contacts
	const resources = await db
		.select({ id: eventResource.resourceId })
		.from(eventResource)
		.where(eq(eventResource.eventId, eventId));

	const contacts = await db
		.select({
			id: eventContact.contactId,
			displayName: contact.displayName,
			givenName: contact.givenName,
			familyName: contact.familyName,
			qrCodePath: contact.qrCodePath,
		})
		.from(eventContact)
		.innerJoin(contact, eq(eventContact.contactId, contact.id))
		.where(eq(eventContact.eventId, eventId));

	// Resolve primary contact details
	let resolvedContact = null;
	if (contacts.length > 0) {
		const primaryContact = contacts[0];

		// Fetch email and phone
		const [email] = await db
			.select({ value: contactEmail.value })
			.from(contactEmail)
			.where(and(
				eq(contactEmail.contactId, primaryContact.id),
				eq(contactEmail.primary, true)
			))
			.limit(1);

		const [phone] = await db
			.select({ value: contactPhone.value })
			.from(contactPhone)
			.where(and(
				eq(contactPhone.contactId, primaryContact.id),
				eq(contactPhone.primary, true)
			))
			.limit(1);

		resolvedContact = {
			name: primaryContact.displayName || `${primaryContact.givenName || ''} ${primaryContact.familyName || ''}`.trim(),
			email: email?.value || '',
			phone: phone?.value || '',
			qrCodeDataUrl: primaryContact.qrCodePath || undefined
		};
	}

	return {
		...result,
		createdAt: result.createdAt.toISOString(),
		updatedAt: result.updatedAt.toISOString(),
		startDateTime: result.startDateTime?.toISOString() ?? null,
		endDateTime: result.endDateTime?.toISOString() ?? null,
		qrCodePath: result.qrCodePath,
		iCalPath: result.iCalPath,
		resourceIds: resources.map(r => r.id),
		contactIds: contacts.map(c => c.id),
		resolvedContact,
	} as Event;
});
