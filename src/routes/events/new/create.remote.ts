import { form } from '$app/server';
import { db } from '$lib/server/db';
import { event, eventResource } from '$lib/server/db/schema';
import { listEvents } from '../list.remote';
import { getAuthenticatedUser, ensureAccess } from '$lib/authorization';
import { syncService } from '$lib/server/sync/service';
import { eventSchema } from '$lib/validations/event';

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

		// Generate a unique ID for the event
		const id = crypto.randomUUID();

		// Convert ISO string dates to Date objects if provided
		const startDateTime = data.startDateTime ? new Date(data.startDateTime) : null;
		const endDateTime = data.endDateTime ? new Date(data.endDateTime) : null;

		const reminders = data.reminders;

		// Insert the event
		const result = await db.insert(event).values({
			id,
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
			guestsCanInviteOthers: data.guestsCanInviteOthers ?? true,
			guestsCanModify: data.guestsCanModify ?? false,
			guestsCanSeeOtherGuests: data.guestsCanSeeOtherGuests ?? true,
			attendeesOmitted: false,
			anyoneCanAddSelf: false,
			locked: false,
			privateCopy: false,
			sequence: 0,
		}).returning();

		// Optionally check insert result
		const row = result[0];
		if (!row) {
			throw new Error('Failed to create event');
		}

		// Associate resources with the event if provided
		if (data.resourceIds && data.resourceIds.length > 0) {
			await db.insert(eventResource).values(
				data.resourceIds.map(resourceId => ({
					eventId: id,
					resourceId,
				}))
			);
		}

		// Trigger sync to external providers (non-blocking)
		syncService.syncSpecificEvents(user.id, [id]).catch((error) => {
			console.error('[createEvent] Failed to sync event to providers:', error);
		});

		// Refresh the list query
		await listEvents().refresh();

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
