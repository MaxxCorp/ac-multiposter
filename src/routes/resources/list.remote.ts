import { query } from '$app/server';
import { resource } from '$lib/server/db/schema';
import { listQuery } from '$lib/server/db/query-helpers';

export interface Resource {
    id: string;
    userId: string;
    locationId: string | null;
    name: string;
    description: string | null;
    type: string;
    createdAt: Date;
    updatedAt: Date;
}

/**
 * Query: List all resources for the current user
 */
export const listResources = query(async (): Promise<Resource[]> => {
    const results = await listQuery({
        table: resource,
        featureName: 'resources',
        transform: (row) => ({
            id: row.id,
            userId: row.userId,
            locationId: row.locationId,
            name: row.name,
            description: row.description,
            type: row.type,
            createdAt: row.createdAt,
            updatedAt: row.updatedAt,
        }),
    });
    return results;
});
