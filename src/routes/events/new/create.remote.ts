import { form } from '$app/server';
import { error } from "@sveltejs/kit";
import { db } from '$lib/server/db';
import { event, eventResource, eventContact, eventLocation, tag, eventTag, recurringSeries } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';
import { listEvents } from '../list.remote';
import { getAuthenticatedUser, ensureAccess } from '$lib/authorization';
import { createEventSchema } from '$lib/validations/events';
import { generateEventAssets } from '$lib/server/events/assets';
import { publishEventChange } from '$lib/server/realtime';
import { syncService } from '$lib/server/sync/service';
import { parseDateTime, toZoned } from '@internationalized/date';

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
		if (!data.startDate) {
			console.error('Missing start date');
			error(400, 'Start date is required');
		}

		let start: Date;
		const startTimeZone = data.startTimeZone || 'UTC';

		try {
			if (data.startTime) {
				// Timed event (has time and timezone)
				const dString = `${data.startDate}T${data.startTime}`;
				const calendarDate = parseDateTime(dString);
				const zonedDate = toZoned(calendarDate, startTimeZone);
				start = zonedDate.toDate();
			} else {
				// All-day event (only date, no time)
				const dString = `${data.startDate}T00:00:00`;
				const calendarDate = parseDateTime(dString);
				const zonedDate = toZoned(calendarDate, startTimeZone);
				start = zonedDate.toDate();
			}
			console.log('Parsed Start Date:', start);
		} catch (e: any) {
			console.error('Invalid start date/time', data.startDate, data.startTime, e);
			error(400, `Invalid start date/time format: ${e.message}`);
		}

		// End date
		let end: Date | null = null;
		if (data.endDate) {
			const endTimeZone = data.endTimeZone || startTimeZone;
			try {
				if (data.endTime) {
					const dString = `${data.endDate}T${data.endTime}`;
					const calendarDate = parseDateTime(dString);
					const zonedDate = toZoned(calendarDate, endTimeZone);
					end = zonedDate.toDate();
				} else {
					const dString = `${data.endDate}T00:00:00`;
					const calendarDate = parseDateTime(dString);
					const zonedDate = toZoned(calendarDate, endTimeZone);
					end = zonedDate.toDate();
				}
				console.log('Parsed End Date:', end);
			} catch (e: any) {
				console.warn(`Invalid end date/time provided, setting to null: ${e.message}`);
				end = null;
			}
		}

		// Handle Recurrence
		let recurrenceRule: string | null = null;
		if (data.recurrence) {
			if (Array.isArray(data.recurrence) && data.recurrence.length > 0) {
				recurrenceRule = data.recurrence[0];
			} else if (typeof data.recurrence === 'string') {
				recurrenceRule = data.recurrence;
			}
		}

		// Handle Tags
		let tagNames: string[] = [];
		if (data.tags) {
			tagNames = data.tags.split(',').map(t => t.trim()).filter(t => t.length > 0);
		}
		if (recurrenceRule && !tagNames.includes('Series')) {
			tagNames.push('Series');
		}
		// Deduplicate tags
		tagNames = [...new Set(tagNames)];

		// Create recurring_series record if recurrence rule exists
		let seriesId: string | null = null;
		if (recurrenceRule) {
			const [newSeries] = await db.insert(recurringSeries).values({
				rrule: recurrenceRule,
				anchorDate: start,
				anchorEndDate: end,
				userId: user.id,
			}).returning();
			if (newSeries) {
				seriesId = newSeries.id;
				console.log('Created recurring_series:', seriesId);
			}
		}

		const eventId = crypto.randomUUID();
		console.log('Generated Event ID:', eventId);

		// Insert Master Event
		console.log('Inserting event into DB...');
		const [newEvent] = await db.insert(event).values({
			id: eventId,
			userId: user.id,
			summary: data.summary,
			description: data.description || null,
			location: data.location || null,
			categoryBerlinDotDe: data.categoryBerlinDotDe || null,
			ticketPrice: data.ticketPrice || null,
			isAllDay: data.isAllDay === 'true' || data.isAllDay === true,
			startDateTime: start,
			startTimeZone: data.startTimeZone || null,
			endDateTime: end,
			endTimeZone: data.endTimeZone || null,
			// New series-based recurrence
			seriesId: seriesId,
			isException: false,
			// Legacy fields (kept for backward compatibility)
			recurrence: recurrenceRule ? [recurrenceRule] : null,
			attendees: (data.attendees as any) || null,
			reminders: reminders as any,
			isPublic: data.isPublic === 'true',
			guestsCanInviteOthers: data.guestsCanInviteOthers === 'true',
			guestsCanModify: data.guestsCanModify === 'true',
			guestsCanSeeOtherGuests: data.guestsCanSeeOtherGuests === 'true',
		}).returning();

		if (!newEvent) {
			console.error('No event returned from insert stub');
			error(500, 'Failed to create event');
		}

		// Helper to link associations
		const linkAssociations = async (targetEventId: string) => {
			// Locations
			const locationIds = typeof data.locationIds === 'string' ? JSON.parse(data.locationIds) : data.locationIds;
			if (locationIds && Array.isArray(locationIds) && locationIds.length > 0) {
				const associations = (locationIds as string[]).map((locationId: string) => ({
					eventId: targetEventId,
					locationId,
				}));
				await db.insert(eventLocation).values(associations);
			}

			// Resources
			const resourceIds = typeof data.resourceIds === 'string' ? JSON.parse(data.resourceIds) : data.resourceIds;
			if (resourceIds && Array.isArray(resourceIds) && resourceIds.length > 0) {
				const associations = (resourceIds as string[]).map((resourceId: string) => ({
					eventId: targetEventId,
					resourceId,
				}));
				await db.insert(eventResource).values(associations);
			}

			// Contacts
			const contactIds = typeof data.contactIds === 'string' ? JSON.parse(data.contactIds) : data.contactIds;
			if (contactIds && Array.isArray(contactIds) && contactIds.length > 0) {
				const associations = (contactIds as string[]).map((contactId: string) => ({
					eventId: targetEventId,
					contactId,
				}));
				await db.insert(eventContact).values(associations);
			}

			// Tags
			if (tagNames.length > 0) {
				for (const name of tagNames) {
					// Find or create tag
					// Note: This is sequential to avoid race conditions on create, potentially slow but safe
					let [existingTag] = await db.select().from(tag).where(and(eq(tag.name, name), eq(tag.userId, user.id)));
					if (!existingTag) {
						[existingTag] = await db.insert(tag).values({ name, userId: user.id }).returning();
					}
					if (existingTag) {
						await db.insert(eventTag).values({ eventId: targetEventId, tagId: existingTag.id }).onConflictDoNothing();
					}
				}
			}
		};

		// Link associations for master event
		await linkAssociations(newEvent.id);

		// Handle Instances
		if (recurrenceRule) {
			try {
				const { expandRecurrence } = await import('$lib/server/events/recurrence');
				const instances = expandRecurrence(recurrenceRule, start, end);

				for (const { date, end: instanceEnd } of instances) {
					const instanceId = crypto.randomUUID();

					await db.insert(event).values({
						id: instanceId,
						userId: user.id,
						summary: data.summary,
						description: data.description || null,
						location: data.location || null,
						categoryBerlinDotDe: data.categoryBerlinDotDe || null,
						ticketPrice: data.ticketPrice || null,
						isAllDay: data.isAllDay === 'true' || data.isAllDay === true,
						startDateTime: date,
						startTimeZone: data.startTimeZone || null,
						endDateTime: data.endTime && instanceEnd ? instanceEnd : null,
						endTimeZone: data.endTimeZone || null,
						// New series-based recurrence
						seriesId: seriesId,
						isException: false,
						// Legacy fields (kept for backward compatibility)
						recurrence: recurrenceRule ? [recurrenceRule] : null,
						recurringEventId: newEvent.id, // Link to master (legacy)
						originalStartTime: { dateTime: date.toISOString() }, // The date this instance represents
						attendees: (data.attendees as any) || null,
						reminders: reminders as any,
						isPublic: data.isPublic === 'true',
						guestsCanInviteOthers: data.guestsCanInviteOthers === 'true',
						guestsCanModify: data.guestsCanModify === 'true',
						guestsCanSeeOtherGuests: data.guestsCanSeeOtherGuests === 'true',
					});

					// Link associations for instance
					await linkAssociations(instanceId);

					// Assets for instance
					// await generateEventAssets(instanceId, origin); // Optional for instances, maybe on demand?
					// Actually, assets might be needed for each instance if they have unique QR codes.
					// Let's generate them.
				}
			} catch (e) {
				console.error('Error expanding recurrence:', e);
				// We don't fail the request, just log error. Master event is created.
			}
		}

		console.log('Generating assets via create.remote...');
		let origin: string | undefined;
		try {
			const { getRequestEvent } = await import('$app/server');
			origin = getRequestEvent()?.url.origin;
		} catch (e) { /* ignore */ }
		await generateEventAssets(newEvent.id, origin);

		// Note: We are not generating assets for all instances synchronously to avoid timeout.
		// They will be generated on access or effectively we should trigger a background job.
		// For now, we leave it.

		console.log('Event created successfully, refreshing list...');

		if (newEvent) {
			await publishEventChange('create', [newEvent.id]);
			// Trigger background sync to external providers
			syncService.triggerPushSync(user.id, newEvent.id);
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
