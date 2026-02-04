import * as v from 'valibot';

export const synchronizationBaseSchema = v.object({
    providerId: v.pipe(v.string(), v.minLength(1, 'Provider ID is required')),
    providerType: v.pipe(v.string(), v.minLength(1, 'Provider type is required')),
    direction: v.picklist(['pull', 'push', 'bidirectional']),
    enabled: v.optional(v.union([v.boolean(), v.string()])),
    credentials: v.optional(v.any()),
    settings: v.optional(v.object({
        calendarId: v.optional(v.string()),
        syncIntervalMinutes: v.optional(v.number()),
        company: v.optional(v.string()),
        baseUrl: v.optional(v.string()),
        username: v.optional(v.string()),
        applicationPassword: v.optional(v.string()),
    })),
});

export const createSynchronizationSchema = synchronizationBaseSchema;

export const updateSynchronizationSchema = v.intersect([
    v.partial(synchronizationBaseSchema),
    v.object({ id: v.pipe(v.string(), v.uuid()) })
]);

export const deleteSynchronizationSchema = v.array(v.pipe(v.string(), v.uuid()));

// Missing exports needed by remote functions
export type CreateSynchronizationInput = v.InferOutput<typeof createSynchronizationSchema>;
export type UpdateSynchronizationInput = v.InferOutput<typeof updateSynchronizationSchema>;

export const getEmailCampaignsSchema = v.object({
    configId: v.pipe(v.string(), v.uuid()),
    limit: v.optional(v.union([v.number(), v.string()])),
    offset: v.optional(v.union([v.number(), v.string()])),
});

