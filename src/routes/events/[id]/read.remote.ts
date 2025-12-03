import { z } from 'zod/mini';
import { query } from '$app/server';
import { db } from '$lib/server/db';
import { event, eventResource } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import type { Event } from '../list.remote';
import { getQuery } from '$lib/server/db/query-helpers';

/**
 * Query: Read a single event by ID
 */
export const readEvent = query(z.string(), async (eventId: string): Promise<Event | null> => {
	const result = await getQuery({
		table: event,
		featureName: 'events',
		id: eventId,
		transform: (row) => ({
			id: row.id,
			userId: row.userId,
			summary: row.summary,
			description: row.description,
			location: row.location,
			startDate: row.startDate,
			startDateTime: row.startDateTime instanceof Date ? row.startDateTime.toISOString() : row.startDateTime,
			startTimeZone: row.startTimeZone,
			endDate: row.endDate,
			endDateTime: row.endDateTime instanceof Date ? row.endDateTime.toISOString() : row.endDateTime,
			endTimeZone: row.endTimeZone,
			eventType: row.eventType,
			status: row.status,
			visibility: row.visibility,
			transparency: row.transparency,
			colorId: row.colorId,
			recurrence: row.recurrence,
			attendees: row.attendees,
			reminders: row.reminders,
			guestsCanInviteOthers: row.guestsCanInviteOthers,
			guestsCanModify: row.guestsCanModify,
			guestsCanSeeOtherGuests: row.guestsCanSeeOtherGuests,
			createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : (row.createdAt ?? null),
			updatedAt: row.updatedAt instanceof Date ? row.updatedAt.toISOString() : (row.updatedAt ?? null),
		}),
	});

	if (!result) {
		return null;
	}

	// Fetch associated resources
	const resources = await db
		.select()
		.from(eventResource)
		.where(eq(eventResource.eventId, eventId));

	return {
		...result,
		resourceIds: resources.map(r => r.resourceId),
	} as Event;
});
