import { query } from '$app/server';
import { event } from '$lib/server/db/schema';
import { listQuery } from '$lib/server/db/query-helpers';

/**
 * Event interface matching the database schema
 */
import type { Event as DbEvent } from '$lib/server/db/events-schema';

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
	participationStatuses?: Record<string, string>;
	maxOccupancy?: number | null;
};

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

	return results;
});
