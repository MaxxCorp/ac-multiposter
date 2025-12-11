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
			...row,
			createdAt: row.createdAt.toISOString(),
			updatedAt: row.updatedAt.toISOString(),
			startDateTime: row.startDateTime?.toISOString() ?? null,
			endDateTime: row.endDateTime?.toISOString() ?? null,
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
