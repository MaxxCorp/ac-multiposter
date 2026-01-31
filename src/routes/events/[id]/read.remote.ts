import { query } from '$app/server';
import { db } from '$lib/server/db';
import { event, eventResource, eventContact, contact, contactEmail, contactPhone, eventLocation } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';
import type { Event } from '../list.remote';
import { getOptionalUser, hasAccess } from '$lib/authorization';
import { error } from '@sveltejs/kit';
import * as v from 'valibot';

/**
 * Query: Read an event by ID
 * 
 * Access rules:
 * - If event is public: anyone can view
 * - If event is private: only authenticated users with 'events' access can view
 */
export const readEvent = query(v.string(), async (eventId: string): Promise<Event | null> => {
	// First, fetch the event to check if it's public
	const [result] = await db
		.select()
		.from(event)
		.where(eq(event.id, eventId));

	if (!result) return null;

	// Check access based on public flag
	const user = getOptionalUser();
	const isAuthorized = user && hasAccess(user, 'events');

	if (!result.isPublic) {
		// Private event: require authentication and authorization
		if (!user) {
			error(403, 'Authentication required to view this event');
		}
		if (!isAuthorized) {
			error(403, 'You do not have permission to view this event');
		}
	}

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

	// Fetch related locations
	const locations = await db
		.select({ id: eventLocation.locationId })
		.from(eventLocation)
		.where(eq(eventLocation.eventId, eventId));

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
		locationIds: locations.map(l => l.id),
		resolvedContact,
	} as Event;
});
