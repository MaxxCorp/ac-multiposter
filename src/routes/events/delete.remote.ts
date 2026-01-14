import { command } from '$app/server';
import { db } from '$lib/server/db';
import { event } from '$lib/server/db/schema';
import { inArray, eq, and } from 'drizzle-orm';
import { listEvents } from './list.remote';
import { getAuthenticatedUser, ensureAccess } from '$lib/authorization';
import * as v from 'valibot';

/**
 * Command for bulk deleting events
 */
export const deleteEvents = command(v.array(v.string()), async (ids: string[]) => {
  const user = getAuthenticatedUser();
  ensureAccess(user, 'events');

  if (ids.length === 0) return { success: true };

  await db.delete(event).where(inArray(event.id, ids));

  await listEvents().refresh();
  return { success: true };
});
