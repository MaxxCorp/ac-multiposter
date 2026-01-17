import { command } from '$app/server';
import { db } from '$lib/server/db';
import { event } from '$lib/server/db/schema';
import { eq, and, inArray } from 'drizzle-orm';
import { listEvents } from '../list.remote';
import { getAuthenticatedUser, ensureAccess } from '$lib/authorization';
import * as v from 'valibot';

/**
 * Command: Delete events by ID
 */
export const deleteEvents = command(
	v.pipe(v.array(v.string()), v.minLength(1)),
	async (ids: string[]) => {
		const user = getAuthenticatedUser();
		ensureAccess(user, 'events');

		await db
			.delete(event)
			.where(inArray(event.id, ids));

		await listEvents().refresh();

		try {
			const { publishEventChange } = await import('$lib/server/events/bus');
			// Publish delete for each ID
			// We do this concurrently for speed
			await Promise.all(ids.map(id => publishEventChange(id, 'DELETE')));
		} catch (e) {
			console.error('Failed to publish event deletion', e);
		}

		return { success: true };
	});
