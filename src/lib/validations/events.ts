import * as v from 'valibot';

const recurrenceSchema = v.union([v.array(v.string()), v.string()]);
const attendeesSchema = v.array(v.object({
	id: v.optional(v.string()),
	email: v.pipe(v.string(), v.email()),
	displayName: v.optional(v.string()),
	optional: v.optional(v.boolean()),
	responseStatus: v.optional(v.string()),
	organizer: v.optional(v.boolean()),
	self: v.optional(v.boolean()),
	resource: v.optional(v.boolean()),
	comment: v.optional(v.string()),
	additionalGuests: v.optional(v.number()),
}));
const remindersSchema = v.object({
	useDefault: v.union([v.boolean(), v.string()]),
	overrides: v.optional(v.array(v.object({
		method: v.string(),
		minutes: v.number()
	})))
});

/**
 * Shared Valibot schema for event creation and updates
 * Using string for start/end to be compatible with RemoteFormInput (SvelteKit)
 */
export const eventBaseSchema = v.object({
	summary: v.pipe(v.string(), v.minLength(1, 'Event title is required')),
	description: v.optional(v.string()),
	location: v.optional(v.string()),
	locationIds: v.optional(v.union([v.array(v.string()), v.string()])),
	// RemoteFormInput only allows string | number | boolean | File | ...
	// So we use string and parse to Date manually where needed.
	start: v.optional(v.string()),
	end: v.optional(v.string()),
	recurrence: v.optional(recurrenceSchema),
	attendees: v.optional(attendeesSchema),
	reminders: v.optional(remindersSchema),
	remindersJson: v.optional(v.string()),
	isPublic: v.optional(v.union([v.boolean(), v.string()])),
	guestsCanInviteOthers: v.optional(v.union([v.boolean(), v.string()])),
	guestsCanModify: v.optional(v.union([v.boolean(), v.string()])),
	guestsCanSeeOtherGuests: v.optional(v.union([v.boolean(), v.string()])),
	resourceIds: v.optional(v.union([v.array(v.string()), v.string()])),
	contactIds: v.optional(v.string()),
	categoryBerlinDotDe: v.optional(v.string()),
	ticketPrice: v.optional(v.string()),
	tags: v.optional(v.string()),
});

/**
 * Schema for creating events
 */
export const createEventSchema = eventBaseSchema;

/**
 * Schema for updating events
 */
export const updateEventSchema = v.intersect([
	v.partial(eventBaseSchema),
	v.object({ id: v.pipe(v.string(), v.uuid()) })
]);
