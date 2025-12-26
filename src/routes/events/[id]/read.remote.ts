import { z } from 'zod/mini';
import { query } from '$app/server';
import { db } from '$lib/server/db';
import { event, eventResource, eventContact, resource } from '$lib/server/db/schema';
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

	const participationStatuses: Record<string, string> = {};
	for (const c of contacts) {
		participationStatuses[c.contactId] = c.participationStatus;
	}

	// 6. Fetch max occupancy of first attached resource
	let maxOccupancy = null;
	if (resources.length > 0) {
		const [res] = await db
			.select()
			.from(resource)
			.where(eq(resource.id, resources[0].resourceId))
			.limit(1);
		if (res) {
			maxOccupancy = res.maxOccupancy;
		}
	}

	return {
		...requestEvent,
		resourceIds: resources.map(r => r.resourceId),
		contactIds: contacts.map(c => c.contactId),
		participationStatuses,
		maxOccupancy
	} as Event;
});
