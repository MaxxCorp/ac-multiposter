import { z } from 'zod/mini';

/**
 * Shared Zod schema for event creation and updates
 * Used by both frontend (form spread attributes) and backend (validation)
 */
export const eventBaseSchema = z.object({
	summary: z.string().check(z.minLength(1, 'Event title is required')),
	description: z.optional(z.string()),
	location: z.optional(z.string()),
	categoryBerlinDotDe: z.optional(z.string()), // Berlin.de event category
	ticketPrice: z.optional(z.string()), // Ticket price information
	startDate: z.optional(z.string()), // yyyy-mm-dd for all-day events
	startDateTime: z.optional(z.string()), // ISO 8601 string for timed events
	startTimeZone: z.optional(z.string()),
	endDate: z.optional(z.string()),
	endDateTime: z.optional(z.string()),
	endTimeZone: z.optional(z.string()),
	eventType: z.optional(z.string()),
	status: z.optional(z.string()),
	visibility: z.optional(z.string()),
	transparency: z.optional(z.string()),
	colorId: z.optional(z.string()),
	recurrence: z.optional(z.array(z.string())), // RRULE strings
	attendees: z.optional(z.array(z.object({
		email: z.string(),
		displayName: z.optional(z.string()),
		optional: z.optional(z.boolean()),
		responseStatus: z.optional(z.string()),
	}))),
	reminders: z.optional(z.object({
		useDefault: z.boolean(),
		overrides: z.optional(z.array(z.object({
			method: z.string(),
			minutes: z.number()
		})))
	})),
	guestsCanInviteOthers: z.optional(z.boolean()),
	guestsCanModify: z.optional(z.boolean()),
	guestsCanSeeOtherGuests: z.optional(z.boolean()),
	resourceIds: z.optional(z.array(z.string())), // Resource IDs to associate with event
	contactIds: z.optional(z.array(z.string())), // Contact IDs to associate with event
});

/**
 * Schema for creating events (no id field)
 * Mirrors updateEventSchema but omits id
 */
export const createEventSchema = eventBaseSchema;

/**
 * Schema for event creation
 * Note: Date/time validation is handled in the form handler since zod/mini doesn't support refine()
 */
export const eventSchema = eventBaseSchema;

/**
 * Schema for updating events (includes id field)
 * Note: zod/mini doesn't support .extend(), so we define it separately
 */
export const updateEventSchema = z.object({
	id: z.string(),
	summary: z.string().check(z.minLength(1, 'Event title is required')),
	description: z.optional(z.string()),
	location: z.optional(z.string()),
	categoryBerlinDotDe: z.optional(z.string()), // Berlin.de event category
	ticketPrice: z.optional(z.string()), // Ticket price information
	startDate: z.optional(z.string()),
	startDateTime: z.optional(z.string()),
	startTimeZone: z.optional(z.string()),
	endDate: z.optional(z.string()),
	endDateTime: z.optional(z.string()),
	endTimeZone: z.optional(z.string()),
	eventType: z.optional(z.string()),
	status: z.optional(z.string()),
	visibility: z.optional(z.string()),
	transparency: z.optional(z.string()),
	colorId: z.optional(z.string()),
	recurrence: z.optional(z.array(z.string())),
	attendees: z.optional(z.array(z.object({
		email: z.string(),
		displayName: z.optional(z.string()),
		optional: z.optional(z.boolean()),
		responseStatus: z.optional(z.string()),
	}))),
	reminders: z.optional(z.object({
		useDefault: z.boolean(),
		overrides: z.optional(z.array(z.object({
			method: z.string(),
			minutes: z.number()
		})))
	})),
	guestsCanInviteOthers: z.optional(z.boolean()),
	guestsCanModify: z.optional(z.boolean()),
	guestsCanSeeOtherGuests: z.optional(z.boolean()),
	resourceIds: z.optional(z.array(z.string())), // Resource IDs to associate with event
	contactIds: z.optional(z.array(z.string())), // Contact IDs to associate with event
});
