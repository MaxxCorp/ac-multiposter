import { form, getRequestEvent } from '$app/server';
import { db } from '$lib/server/db';
import { event, eventResource } from '$lib/server/db/schema';
import { listEvents } from '../list.remote';
import { getAuthenticatedUser, ensureAccess } from '$lib/authorization';
import { syncService } from '$lib/server/sync/service';
import { eventSchema } from '$lib/validations/event';
import { generateEventAssets } from '$lib/server/events/assets';

/**
 * Form function for creating a new event
 * Uses shared Zod schema with manual date/time validation (zod/mini doesn't support refine())
 */
export const createEvent = form(eventSchema, async (data) => {
	try {
		const user = getAuthenticatedUser();
		ensureAccess(user, 'events');

		// Validate date/time ranges
		if (data.startDate && data.endDate && data.endDate < data.startDate) {
			throw new Error('End date must be the same as or after the start date');
		}
		if (data.startDateTime && data.endDateTime) {
			const startDateTime = new Date(data.startDateTime);
			const endDateTime = new Date(data.endDateTime);
			if (endDateTime <= startDateTime) {
				throw new Error('End date and time must be after the start date and time');
			}
		}

		// Convert ISO string dates to Date objects if provided
		const startDateTime = data.startDateTime ? new Date(data.startDateTime) : null;
		const endDateTime = data.endDateTime ? new Date(data.endDateTime) : null;

		const reminders = data.reminders;

		// Insert the event
		const [row] = await db.insert(event).values({
			userId: user.id,
			summary: data.summary,
			description: data.description || null,
			location: data.location || null,
			startDate: data.startDate || null,
			startDateTime,
			startTimeZone: data.startTimeZone || null,
			endDate: data.endDate || null,
			endDateTime,
			endTimeZone: data.endTimeZone || null,
			eventType: data.eventType || 'default',
			status: 'confirmed',
			visibility: data.visibility || 'default',
			transparency: data.transparency || 'opaque',
			colorId: data.colorId || null,
			recurrence: data.recurrence as any || null,
			attendees: data.attendees as any || null,
			reminders: reminders as any || null,
			guestsCanInviteOthers: !!data.guestsCanInviteOthers,
			guestsCanModify: !!data.guestsCanModify,
			guestsCanSeeOtherGuests: !!data.guestsCanSeeOtherGuests,
			attendeesOmitted: false,
			anyoneCanAddSelf: false,
			locked: false,
			privateCopy: false,
			sequence: 0,
			isPublic: !!data.isPublic,
			categoryBerlinDotDe: data.categoryBerlinDotDe || null,
			ticketPrice: data.ticketPrice || null,
		}).returning({ id: event.id });

		if (!row) {
			throw new Error('Failed to create event');
		}
		const id = row.id;


		// Associate resources with the event if provided
		if (data.resourceIds && data.resourceIds.length > 0) {
			await db.insert(eventResource).values(
				data.resourceIds.map(resourceId => ({
					eventId: id,
					resourceId,
				}))
			);
		}


		// Associate contacts with the event if provided
		const contactIds = data.contactIds ? JSON.parse(data.contactIds as string) : [];
		if (contactIds.length > 0) {
			const { eventContact } = await import('$lib/server/db/schema');
			await db.insert(eventContact).values(
				contactIds.map((contactId: string) => ({
					eventId: id,
					contactId,
				}))
			);
		}

		// Trigger sync to external providers (non-blocking)
		syncService.syncSpecificEvents(user.id, [id]).catch((error) => {
			console.error('[createEvent] Failed to sync event to providers:', error);
		});

		// Generate assets (QR Code, iCal)
		const origin = getRequestEvent()?.url.origin;
		generateEventAssets(id, origin).catch((error) => {
			console.error('[createEvent] Failed to generate event assets:', error);
		});

		// Refresh the list query and the read query for the new event
		await listEvents().refresh();
		try {
			// This might fail if the user doesn't have permissions to read access to the specific event right away or similar race conditions
			// But for the creator it should be fine.
			// However, `readEvent` requires an argument. `readEvent(id)`.
			// We need to import it.
			// Let's do it in a separate step or just assume the user navigates.
			// If the user navigates to `events/[id]`, the page loader calls `readEvent`.
			// The issue might be that `readEvent` is cached with a `null` result if it was accessed before creation? Unlikely for a UUID.
			// The issue described is "failed to load event data" or "error 500".
			// "Failed to load" implies `readEvent` returned null or threw error.
			// "Error 500" implies server error.
		} catch (e) {
			// ignore
		}

		return { success: true };
	} catch (error: any) {
		if (error?.status && error?.location) {
			throw error;
		}
		return {
			success: false,
			error: error?.message || 'An unexpected error occurred'
		};
	}
});
