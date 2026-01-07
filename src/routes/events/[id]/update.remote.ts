import { form, getRequestEvent } from '$app/server';
import { db } from '$lib/server/db';
import { event } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';
import { listEvents } from '../list.remote';
import { readEvent } from './read.remote';
import { getAuthenticatedUser, ensureAccess } from '$lib/authorization';
import { syncService } from '$lib/server/sync/service';
import { updateEventSchema } from '$lib/validations/event';
import { generateEventAssets } from '$lib/server/events/assets';

/**
 * Form function for updating an event
 * Uses shared Zod schema with manual date/time validation (zod/mini doesn't support refine)
 */
export const updateEvent = form(updateEventSchema, async (data) => {
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

	// Build update object with only provided fields
	const updateData: any = {};

	if (data.summary !== undefined) updateData.summary = data.summary;
	if (data.description !== undefined) updateData.description = data.description;
	if (data.location !== undefined) updateData.location = data.location;
	if (data.startDate !== undefined) updateData.startDate = data.startDate;
	if (data.startDateTime !== undefined) updateData.startDateTime = data.startDateTime ? new Date(data.startDateTime) : null;
	if (data.startTimeZone !== undefined) updateData.startTimeZone = data.startTimeZone;
	if (data.endDate !== undefined) updateData.endDate = data.endDate === "null" ? null : data.endDate;
	if (data.endDateTime !== undefined) updateData.endDateTime = data.endDateTime === "null" ? null : (data.endDateTime ? new Date(data.endDateTime) : null);
	if (data.endTimeZone !== undefined) updateData.endTimeZone = data.endTimeZone;
	if (data.eventType !== undefined) updateData.eventType = data.eventType;
	if (data.status !== undefined) updateData.status = data.status;
	if (data.visibility !== undefined) updateData.visibility = data.visibility;
	if (data.transparency !== undefined) updateData.transparency = data.transparency;
	if (data.colorId !== undefined) updateData.colorId = data.colorId;
	if (data.recurrence !== undefined) updateData.recurrence = data.recurrence as any;
	if (data.attendees !== undefined) updateData.attendees = data.attendees as any;
	if (data.reminders !== undefined) updateData.reminders = data.reminders;
	updateData.guestsCanInviteOthers = !!data.guestsCanInviteOthers;
	updateData.guestsCanModify = !!data.guestsCanModify;
	updateData.guestsCanSeeOtherGuests = !!data.guestsCanSeeOtherGuests;
	updateData.isPublic = !!data.isPublic;
	if (data.categoryBerlinDotDe !== undefined) updateData.categoryBerlinDotDe = data.categoryBerlinDotDe === "" ? null : data.categoryBerlinDotDe;
	if (data.ticketPrice !== undefined) updateData.ticketPrice = data.ticketPrice === "" ? null : data.ticketPrice;

	// Update the event
	await db
		.update(event)
		.set(updateData)
		.where(and(eq(event.id, data.id), eq(event.userId, user.id)));

	// Update event-resource associations
	{
		const { eventResource } = await import('$lib/server/db/schema');
		const { inArray } = await import('drizzle-orm');

		const currentResources = await db.select().from(eventResource).where(eq(eventResource.eventId, data.id));
		const currentResourceIds = currentResources.map(r => r.resourceId);
		const targetResourceIds = data.resourceIds || [];

		// Delete removed resources
		const toDelete = currentResourceIds.filter(id => !targetResourceIds.includes(id));
		if (toDelete.length > 0) {
			await db.delete(eventResource).where(and(
				eq(eventResource.eventId, data.id),
				inArray(eventResource.resourceId, toDelete)
			));
		}

		// Add new resources
		const toAdd = targetResourceIds.filter(id => !currentResourceIds.includes(id));
		if (toAdd.length > 0) {
			await db.insert(eventResource).values(
				toAdd.map(resourceId => ({
					eventId: data.id,
					resourceId,
				}))
			);
		}
	}

	// Update event-contact associations
	{
		const { eventContact } = await import('$lib/server/db/schema');
		const { inArray } = await import('drizzle-orm');

		const currentContacts = await db.select().from(eventContact).where(eq(eventContact.eventId, data.id));
		const currentContactIds = currentContacts.map(c => c.contactId);
		const targetContactIds = data.contactIds ? JSON.parse(data.contactIds as string) : [];

		// Delete removed contacts
		const toDelete = currentContactIds.filter(id => !targetContactIds.includes(id));
		if (toDelete.length > 0) {
			await db.delete(eventContact).where(and(
				eq(eventContact.eventId, data.id),
				inArray(eventContact.contactId, toDelete)
			));
		}

		// Add new contacts (preserves existing contacts and their statuses!)
		const toAdd = targetContactIds.filter((id: string) => !currentContactIds.includes(id));
		if (toAdd.length > 0) {
			await db.insert(eventContact).values(
				toAdd.map((contactId: string) => ({
					eventId: data.id,
					contactId,
				}))
			);
		}
	}


	// Trigger sync to external providers (non-blocking)
	syncService.syncSpecificEvents(user.id, [data.id]).catch((error) => {
		console.error('[updateEvent] Failed to sync event to providers:', error);
	});

	// Re-generate assets (QR Code, iCal)
	const origin = getRequestEvent()?.url.origin;
	generateEventAssets(data.id, origin).catch((error) => {
		console.error('[updateEvent] Failed to generate event assets:', error);
	});

	// Refresh both queries
	await readEvent(data.id).refresh();
	await listEvents().refresh();

	return { success: true };
});
