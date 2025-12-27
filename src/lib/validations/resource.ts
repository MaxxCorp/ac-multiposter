import { z } from "zod/mini";

const allocationCalendarSchema = z.object({
    provider: z.string().check(z.minLength(1, "Provider is required")),
    calendarId: z.string().check(z.minLength(1, "Calendar ID is required")),
});

export const createResourceSchema = z.object({
    name: z.string().check(z.minLength(1, "Name is required")),
    description: z.optional(z.string()),
    maxOccupancy: z.optional(z.number()),
    type: z.string().check(z.minLength(1, "Type is required")),
    locationId: z.optional(z.string()),
    parentResourceIds: z.optional(z.array(z.string())), // For many-to-many hierarchy
    allocationCalendars: z.optional(z.string()), // JSON string of allocation calendars
});

export const updateResourceSchema = z.object({
    id: z.string().check(z.minLength(1, "ID is required")),
    name: z.string().check(z.minLength(1, "Name is required")),
    description: z.optional(z.string()),
    maxOccupancy: z.optional(z.number()),
    type: z.string().check(z.minLength(1, "Type is required")),
    locationId: z.optional(z.string()),
    parentResourceIds: z.optional(z.array(z.string())), // For many-to-many hierarchy
    allocationCalendars: z.optional(z.string()), // JSON string of allocation calendars
});

export type CreateResourceSchema = z.infer<typeof createResourceSchema>;
export type UpdateResourceSchema = z.infer<typeof updateResourceSchema>;
export type AllocationCalendar = z.infer<typeof allocationCalendarSchema>;

