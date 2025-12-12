import { type InferSelectModel } from 'drizzle-orm';
import { query } from '$app/server';
import { resource } from '$lib/server/db/schema';
import { listQuery } from '$lib/server/db/query-helpers';

export type Resource = InferSelectModel<typeof resource>;

/**
 * Query: List all resources for the current user
 */
export const listResources = query(async (): Promise<Resource[]> => {
    const results = await listQuery({
        table: resource,
        featureName: 'resources',
        transform: (row) => ({
            ...row,
        }),
    });
    return results;
});
