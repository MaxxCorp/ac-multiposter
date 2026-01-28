import { command } from '$app/server';
import { db } from '$lib/server/db';
import { event } from '$lib/server/db/schema';
import { eq, and, inArray } from 'drizzle-orm';
import { listEvents } from '../list.remote';
import { getAuthenticatedUser, ensureAccess } from '$lib/authorization';
import * as v from 'valibot';
import { publishEventChange } from '$lib/server/realtime';
import { syncService } from '$lib/server/sync/service';

/**
 * Command: Delete events by ID
 */
export const deleteEvents = command(
	v.pipe(v.array(v.string()), v.minLength(1)),
	async (ids: string[]) => {
		const user = getAuthenticatedUser();
		ensureAccess(user, 'events');

		// Trigger sync deletion first (before local event is gone)
		await syncService.deleteEventMappings(user.id, ids);

		await db
			.delete(event)
			.where(inArray(event.id, ids));

		// We assume all were deleted for notification purposes, or we could fetch existing before delete
		await publishEventChange('delete', ids);

		await listEvents().refresh();
		return { success: true };
	});
