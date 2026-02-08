import { query } from '$app/server';
import { event } from '$lib/server/db/schema';
import { listQuery } from '$lib/server/db/query-helpers';

/**
 * Event interface matching the database schema
 */
import type { Event as DbEvent } from '$lib/server/db/schema';

/**
 * Event interface matching the database schema, with dates serialized to strings
 */
export type Event = Omit<DbEvent, 'createdAt' | 'updatedAt' | 'startDateTime' | 'endDateTime'> & {
	createdAt: string;
	updatedAt: string;
	startDateTime: string | null;
	endDateTime: string | null;
	resourceIds?: string[];
	contactIds?: string[];
	locationIds?: string[];
	tags?: string[];
	participationStatuses?: Record<string, string>;
	maxOccupancy?: number | null;
	resolvedContact?: {
		name: string;
		email: string;
		phone: string;
		qrCodeDataUrl?: string;
	} | null;
	qrCodePath?: string | null;
	iCalPath?: string | null;
};

/**
 * List all events for the authenticated user
 */
import { inArray, eq } from 'drizzle-orm';
import { eventTag, tag } from '$lib/server/db/schema';
import { db } from '$lib/server/db';

/**
 * List all events for the authenticated user
 */
export const listEvents = query(async (): Promise<Event[]> => {
	const results = await listQuery({
		table: event,
		featureName: 'events',
		transform: (row) => ({
			...row,
			createdAt: row.createdAt.toISOString(),
			updatedAt: row.updatedAt.toISOString(),
			startDateTime: row.startDateTime?.toISOString() ?? null,
			endDateTime: row.endDateTime?.toISOString() ?? null,
		}),
	});

	if (results.length === 0) {
		return [];
	}

	// Fetch tags for all events
	const eventIds = results.map((e) => e.id);
	const tagsForEvents = await db
		.select({
			eventId: eventTag.eventId,
			tagName: tag.name,
		})
		.from(eventTag)
		.innerJoin(tag, eq(eventTag.tagId, tag.id))
		.where(inArray(eventTag.eventId, eventIds));

	// Map tags to events
	const tagsMap = new Map<string, string[]>();
	for (const { eventId, tagName } of tagsForEvents) {
		if (!tagsMap.has(eventId)) {
			tagsMap.set(eventId, []);
		}
		if (tagName) {
			tagsMap.get(eventId)?.push(tagName);
		}
	}

	// Attach tags to results
	return results.map((event) => ({
		...event,
		tags: tagsMap.get(event.id) || [],
	}));
});
