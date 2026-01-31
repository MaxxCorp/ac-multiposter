import * as v from 'valibot';

export const announcementBaseSchema = v.object({
    title: v.pipe(v.string(), v.minLength(1, 'Title is required')),
    content: v.pipe(v.string(), v.minLength(1, 'Content is required')),
    isPublic: v.optional(v.union([v.boolean(), v.string()])),
    tagIds: v.optional(v.union([v.array(v.string()), v.string()])), // Can be array of IDs or JSON string
    contactIds: v.optional(v.string()), // JSON string of IDs
    locationIds: v.optional(v.union([v.array(v.string()), v.string()])), // JSON string or array of IDs
    tagNames: v.optional(v.string()), // JSON string of tag names (for creation)
});

export const createAnnouncementSchema = announcementBaseSchema;

export const updateAnnouncementSchema = v.intersect([
    v.partial(announcementBaseSchema),
    v.object({ id: v.pipe(v.string(), v.uuid()) })
]);
