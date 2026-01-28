import { form } from '$app/server';
import { error } from "@sveltejs/kit";
import { db } from '$lib/server/db';
import { event, eventResource, eventContact } from '$lib/server/db/schema';
import { listEvents } from '../list.remote';
import { getAuthenticatedUser, ensureAccess } from '$lib/authorization';
import { createEventSchema } from '$lib/validations/events';
import { generateEventAssets } from '$lib/server/events/assets';
import { publishEventChange } from '$lib/server/realtime';
import { syncService } from '$lib/server/sync/service';

export const createNewEvent = form(createEventSchema, async (data) => {
	console.log('--- createNewEvent START ---');
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

		// Convert and type-safety check start/end dates
		if (!data.start) {
			console.error('Missing start date');
			error(400, 'Start date is required');
		}
		const start = new Date(data.start);
		console.log('Parsed Start Date:', start);

		if (isNaN(start.getTime())) {
			console.error('Invalid start date', data.start);
			error(400, `Invalid start date: ${data.start}`);
		}

		// End date is optional in the database but we usually want one
		let end: Date | null = null;
		if (data.end) {
			end = new Date(data.end);
			console.log('Parsed End Date:', end);
			if (isNaN(end.getTime())) {
				console.warn(`Invalid end date provided: ${data.end}, setting to null`);
				end = null;
			}
		}

		const eventId = crypto.randomUUID();
		console.log('Generated Event ID:', eventId);

		// Perform insertion
		console.log('Inserting event into DB...');
		const [newEvent] = await db.insert(event).values({
			id: eventId,
			userId: user.id,
			summary: data.summary,
			description: data.description || null,
			location: data.location || null,
			locationId: data.locationId || null,
			categoryBerlinDotDe: data.categoryBerlinDotDe || null,
			ticketPrice: data.ticketPrice || null,
			startDateTime: start,
			endDateTime: end,
			recurrence: data.recurrence || null,
			// Casting to any to bypass strict type check for JSON columns if needed
			attendees: (data.attendees as any) || null,
			reminders: reminders as any,
			isPublic: data.isPublic === 'true',
			guestsCanInviteOthers: data.guestsCanInviteOthers === 'true',
			guestsCanModify: data.guestsCanModify === 'true',
			guestsCanSeeOtherGuests: data.guestsCanSeeOtherGuests === 'true',
		}).returning();

		console.log('Insert result:', newEvent);

		if (!newEvent) {
			console.error('No event returned from insert stub');
			error(500, 'Failed to create event');
		}

		// Associate resources if provided
		const resourceIds = typeof data.resourceIds === 'string' ? JSON.parse(data.resourceIds) : data.resourceIds;
		if (resourceIds && Array.isArray(resourceIds) && resourceIds.length > 0) {
			console.log('Associating resources:', resourceIds);
			const resourceAssociations = (resourceIds as string[]).map((resourceId: string) => ({
				eventId: newEvent.id,
				resourceId,
			}));
			await db.insert(eventResource).values(resourceAssociations);
		}

		// Associate contacts if provided
		const contactIds = typeof data.contactIds === 'string' ? JSON.parse(data.contactIds) : data.contactIds;
		console.log('Associating contacts:', contactIds);
		if (contactIds && Array.isArray(contactIds) && contactIds.length > 0) {
			const contactAssociations = contactIds.map((contactId: string) => ({
				eventId: newEvent.id,
				contactId,
			}));
			await db.insert(eventContact).values(contactAssociations);
		}

		console.log('Generating assets via create.remote...');
		let origin: string | undefined;
		try {
			const { getRequestEvent } = await import('$app/server');
			origin = getRequestEvent()?.url.origin;
		} catch (e) { /* ignore */ }
		await generateEventAssets(newEvent.id, origin);

		console.log('Event created successfully, refreshing list...');

		if (newEvent) {
			await publishEventChange('create', [newEvent.id]);
			// Trigger background sync to external providers
			syncService.triggerPushSync(user.id);
		}

		await listEvents().refresh();
		console.log('--- createNewEvent DONE ---');
		return { success: true };
	} catch (err: any) {
		console.error('--- createNewEvent ERROR ---', err);
		if (err?.status && err?.location) {
			error(500, err.message);
		}
		return {
			success: false,
			error: err?.message || 'An unexpected error occurred'
		};
	}
});
