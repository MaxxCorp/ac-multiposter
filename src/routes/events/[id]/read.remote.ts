import { z } from 'zod/mini';
import { query } from '$app/server';
import { db } from '$lib/server/db';
import { event, eventResource, eventContact } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import type { Event } from '../list.remote';
import { getAuthenticatedUser, ensureAccess } from '$lib/authorization';

/**
 * Query: Read a single event by ID
 */
export const readEvent = query(z.string(), async (eventId: string): Promise<Event | null> => {
	// 1. Fetch the event directly without auth check first
	const row = await db.query.event.findFirst({
		where: (table, { eq }) => eq(table.id, eventId),
	});

	if (!row) {
		return null;
	}

	// 2. Check Authorization
	// If NOT public, enforce authentication and access control
	if (!row.isPublic) {
		const user = getAuthenticatedUser();
		ensureAccess(user, 'events');
	}

	// 3. Transform data
	const requestEvent = {
		...row,
		createdAt: row.createdAt.toISOString(),
		updatedAt: row.updatedAt.toISOString(),
		startDateTime: row.startDateTime?.toISOString() ?? null,
		endDateTime: row.endDateTime?.toISOString() ?? null,
	};

	// 4. Fetch associated resources
	const resources = await db
		.select()
		.from(eventResource)
		.where(eq(eventResource.eventId, eventId));

	// 5. Fetch associated contacts
	const contacts = await db
		.select()
		.from(eventContact)
		.where(eq(eventContact.eventId, eventId));

	return {
		...requestEvent,
		resourceIds: resources.map(r => r.resourceId),
		contactIds: contacts.map(c => c.contactId),
	} as Event;
});
