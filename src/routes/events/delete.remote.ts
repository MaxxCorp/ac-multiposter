import { z } from 'zod/mini';
import { command } from '$app/server';
import { db } from '$lib/server/db';
import { event } from '$lib/server/db/schema';
import { inArray, and, eq } from 'drizzle-orm';
import { getAuthenticatedUser, ensureAccess } from '$lib/authorization';
import { listEvents } from './list.remote';
import { getStorageProvider } from '$lib/server/blob-storage';

const deleteEventsSchema = z.array(z.string());

/**
 * Remote function to delete events by ID array
 */
export const deleteEvents = command(deleteEventsSchema, async (ids: string[]) => {
  const user = getAuthenticatedUser();
  ensureAccess(user, 'events');

  if (!Array.isArray(ids) || ids.length === 0) return { count: 0 };

  // Fetch events to get asset paths before deletion
  const eventsToDelete = await db.query.event.findMany({
    where: (table, { and, eq, inArray }) => and(eq(table.userId, user.id), inArray(table.id, ids))
  });

  // Only delete events belonging to the user
  const result = await db.delete(event)
    .where(and(eq(event.userId, user.id), inArray(event.id, ids)))
    .returning({ id: event.id });

  const deletedIds = result.map(r => r.id);
  const storage = getStorageProvider();

  // Clean up assets for deleted events
  for (const eventItem of eventsToDelete) {
    if (deletedIds.includes(eventItem.id)) {
      if (eventItem.iCalPath) await storage.delete(eventItem.iCalPath);
      if (eventItem.qrCodePath) await storage.delete(eventItem.qrCodePath);
    }
  }

  // Refresh the list
  await listEvents().refresh();

  return { count: result.length, ids: result.map(r => r.id) };
});
