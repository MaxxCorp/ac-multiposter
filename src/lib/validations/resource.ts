import { z } from "zod";

const allocationCalendarSchema = z.object({
    provider: z.string().min(1, "Provider is required"),
    calendarId: z.string().min(1, "Calendar ID is required"),
});

export const createResourceSchema = z.object({
    name: z.string().min(1, "Name is required"),
    description: z.string().optional(),
    maxOccupancy: z.number().optional(),
    type: z.string().min(1, "Type is required"),
    locationId: z.string().optional(),
    parentResourceIds: z.array(z.string()).optional(), // For many-to-many hierarchy
    allocationCalendars: z.string().optional(), // JSON string of allocation calendars
});

export const updateResourceSchema = createResourceSchema.extend({
    id: z.string().min(1, "ID is required"),
});

export type CreateResourceSchema = z.infer<typeof createResourceSchema>;
export type UpdateResourceSchema = z.infer<typeof updateResourceSchema>;
export type AllocationCalendar = z.infer<typeof allocationCalendarSchema>;

