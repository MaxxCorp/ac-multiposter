import { query } from '$app/server';
import { db } from '$lib/server/db';
import { event, eventResource, eventContact, contact, contactEmail, contactPhone, eventLocation, contactTag, tag, locationContact, eventTag } from '$lib/server/db/schema';
import { eq, and, inArray } from 'drizzle-orm';
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

	// 1. Check for Event Contact with 'Employee' tag
	let chosenContactId: string | null = null;

	// Fetch contacts with their tags
	const contactsWithTags = await db
		.select({
			contactId: eventContact.contactId,
			tagName: tag.name
		})
		.from(eventContact)
		.leftJoin(contactTag, eq(eventContact.contactId, contactTag.contactId))
		.leftJoin(tag, eq(contactTag.tagId, tag.id))
		.where(eq(eventContact.eventId, eventId));

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

	// 2. If no Event Employee Contact, check Location Employee Contacts
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
		// Note: The order isn't strictly defined by the prompt for multiple locations, 
		// effectively "first found" in query order.
		const locContact = locationContacts.find(row => row.tagName === 'Employee');
		if (locContact) {
			chosenContactId = locContact.contactId;
		}
	}

	// 3. Fallback: First event contact (if any)
	if (!chosenContactId && contacts.length > 0) {
		chosenContactId = contacts[0].id;
	}

	if (chosenContactId) {
		resolvedContact = await fetchContactInfo(chosenContactId);
	}

	// Fetch tags
	const tags = await db
		.select({ name: tag.name })
		.from(eventTag)
		.innerJoin(tag, eq(eventTag.tagId, tag.id))
		.where(eq(eventTag.eventId, eventId));

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
		tags: tags.map(t => t.name),
		resolvedContact,
	} as Event;
});
