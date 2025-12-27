import { z } from 'zod/mini';

export const SyncDirectionSchema = z.enum(['pull', 'push', 'bidirectional']);

export const CreateSyncSchema = z.object({
    providerType: z.enum(['google-calendar', 'microsoft-calendar', 'berlin-de-main-calendar', 'wp-the-events-calendar', 'eventbrite', 'meetup', 'seniorennetz-berlin', 'bewegungsatlas-berlin', 'email']),
    providerId: z.string(),
    direction: SyncDirectionSchema,
    settings: z.optional(
        z.object({
            calendarId: z.optional(z.string()),
            syncIntervalMinutes: z.optional(z.number()),
            company: z.optional(z.string()),
            fieldMappings: z.optional(z.record(z.string(), z.string())),
            baseUrl: z.optional(z.string()),
            username: z.optional(z.string()),
            applicationPassword: z.optional(z.string())
        })
    )
});

export const UpdateSyncSchema = z.object({
    id: z.string(),
    input: z.object({
        enabled: z.optional(z.boolean()),
        settings: z.optional(
            z.object({
                calendarId: z.optional(z.string()),
                syncIntervalMinutes: z.optional(z.number())
            })
        )
    })
});

export const GetEmailCampaignsSchema = z.object({
    syncConfigId: z.string(),
    limit: z.optional(z.number()),
    offset: z.optional(z.number())
});

export type CreateSyncInput = z.infer<typeof CreateSyncSchema>;
export type UpdateSyncInput = z.infer<typeof UpdateSyncSchema>;

