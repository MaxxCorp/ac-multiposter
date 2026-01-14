import * as v from 'valibot';

export interface AllocationCalendar {
    provider: string;
    calendarId: string;
}

export const resourceBaseSchema = v.object({
    name: v.pipe(v.string(), v.minLength(1, 'Name is required')),
    description: v.optional(v.string()),
    type: v.pipe(v.string(), v.minLength(1, 'Resource type is required')),
    maxOccupancy: v.optional(v.union([v.number(), v.string()])), // Allow string from form
    locationId: v.optional(v.pipe(v.string())), // UUID or empty string
    allocationCalendars: v.optional(v.union([
        v.pipe(v.string(), v.transform((v) => JSON.parse(v))),
        v.array(v.object({
            provider: v.string(),
            calendarId: v.string(),
        }))
    ])),

    parentResourceIds: v.optional(v.array(v.string())),
});

export const createResourceSchema = resourceBaseSchema;
export const updateResourceSchema = v.intersect([
    resourceBaseSchema,
    v.object({ id: v.pipe(v.string()) })
]);
export const deleteResourceSchema = v.array(v.pipe(v.string()));

