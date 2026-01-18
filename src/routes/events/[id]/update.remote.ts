import { form } from '$app/server';
import { db } from '$lib/server/db';
import { event, eventResource, eventContact } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';
import { listEvents } from '../list.remote';
import { readEvent } from './read.remote';
import { getAuthenticatedUser, ensureAccess } from '$lib/authorization';
import { updateEventSchema } from '$lib/validations/events';
import { error } from '@sveltejs/kit';
import { generateEventAssets } from '$lib/server/events/assets';
import { publishEventChange } from '$lib/server/redis';

export const updateExistingEvent = form(updateEventSchema, async (data) => {
	console.log('--- updateExistingEvent START ---');
	console.log('Raw Data:', JSON.stringify(data, null, 2));
	try {
		console.log('Authenticating user...');
		const user = getAuthenticatedUser();
		ensureAccess(user, 'events');
		console.log('User authenticated:', user.id);

		// Handle serialized reminders if provided
		let reminders = data.reminders;
		if (data.remindersJson) {
			console.log('Parsing remindersJson...');
			try {
				reminders = JSON.parse(data.remindersJson);
				console.log('Parsed reminders:', JSON.stringify(reminders));
			} catch (e) {
				console.error('Failed to parse remindersJson', e);
			}
		}

		// Prepare update object
		const updateData: any = {
			updatedAt: new Date(),
		};

		if (data.summary !== undefined) updateData.summary = data.summary;
		if (data.description !== undefined) updateData.description = data.description;
		if (data.location !== undefined) updateData.location = data.location;
		if (data.locationId !== undefined) updateData.locationId = data.locationId || null;
		if (data.categoryBerlinDotDe !== undefined) updateData.categoryBerlinDotDe = data.categoryBerlinDotDe;
		if (data.ticketPrice !== undefined) updateData.ticketPrice = data.ticketPrice;

		if (data.start !== undefined) {
			if (!data.start) {
				console.error('Start date explicitly cleared (empty string) prohibited?');
				// Logic might allow nulling start? Schema minLength checks usually block this if required.
			} else {
				const start = new Date(data.start);
				console.log('Parsed Start Date:', start);
				if (!isNaN(start.getTime())) {
					updateData.startDateTime = start;
				}
			}
		}

		if (data.end !== undefined) {
			if (!data.end) {
				updateData.endDateTime = null;
			} else {
				const end = new Date(data.end);
				console.log('Parsed End Date:', end);
				if (!isNaN(end.getTime())) {
					updateData.endDateTime = end;
				} else {
					console.warn(`Invalid end date provided: ${data.end}`);
				}
			}
		}

		if (data.recurrence !== undefined) updateData.recurrence = data.recurrence || null;
		if (data.attendees !== undefined) updateData.attendees = data.attendees || null;
		if (reminders !== undefined) updateData.reminders = reminders || null;

		if (data.isPublic !== undefined) updateData.isPublic = data.isPublic === 'true';
		if (data.guestsCanInviteOthers !== undefined) updateData.guestsCanInviteOthers = data.guestsCanInviteOthers === 'true';
		if (data.guestsCanModify !== undefined) updateData.guestsCanModify = data.guestsCanModify === 'true';
		if (data.guestsCanSeeOtherGuests !== undefined) updateData.guestsCanSeeOtherGuests = data.guestsCanSeeOtherGuests === 'true';

		console.log('Update payload:', JSON.stringify(updateData, null, 2));

		const [updatedEvent] = await db
			.update(event)
			.set(updateData)
			.where(and(eq(event.id, data.id), eq(event.userId, user.id)))
			.returning();

		console.log('Update result:', updatedEvent);

		if (!updatedEvent) {
			console.error('Update failed, event not found or access denied');
			error(404, 'Event not found');
		}


		// Update resources associations
		if (data.resourceIds !== undefined) { // Check if field was submitted
			const resourceIds = typeof data.resourceIds === 'string' ? JSON.parse(data.resourceIds) : data.resourceIds;
			console.log('Updating resources to:', resourceIds);

			// Delete existing
			await db.delete(eventResource).where(eq(eventResource.eventId, data.id));

			// Insert new
			if (Array.isArray(resourceIds) && resourceIds.length > 0) {
				const resourceAssociations = (resourceIds as string[]).map((resourceId: string) => ({
					eventId: data.id,
					resourceId,
				}));
				await db.insert(eventResource).values(resourceAssociations);
			}
		}

		// Update contacts associations
		if (data.contactIds !== undefined) {
			const contactIds = typeof data.contactIds === 'string' ? JSON.parse(data.contactIds) : data.contactIds;
			console.log('Updating contacts to:', contactIds);
			// Delete existing
			await db.delete(eventContact).where(eq(eventContact.eventId, data.id));

			// Insert new
			if (contactIds && Array.isArray(contactIds) && contactIds.length > 0) {
				const contactAssociations = contactIds.map((contactId: string) => ({
					eventId: data.id,
					contactId,
				}));
				await db.insert(eventContact).values(contactAssociations);
			}
		}

		console.log('Regenerating assets via update.remote...');
		await generateEventAssets(data.id);

		console.log('Event updated successfully, refreshing list...');

		if (updatedEvent) {
			await publishEventChange('update', [updatedEvent.id]);
		}

		await listEvents().refresh();
		console.log('--- updateExistingEvent DONE ---');
		return { success: true };
	} catch (err: any) {
		console.error('--- updateExistingEvent ERROR ---', err);
		if (err?.status && err?.location) {
			error(500, err.message);
		}
		return {
			success: false,
			error: err?.message || 'An unexpected error occurred'
		};
	}
});
