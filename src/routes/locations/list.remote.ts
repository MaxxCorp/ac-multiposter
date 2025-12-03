import { query } from '$app/server';
import { location } from '$lib/server/db/schema';
import { listQuery } from '$lib/server/db/query-helpers';

export interface Location {
    id: string;
    userId: string;
    name: string;
    address: string | null;
    roomId: string | null;
    latitude: number | null;
    longitude: number | null;
    what3words: string | null;
    createdAt: Date;
    updatedAt: Date;
}

/**
 * Query: List all locations for the current user
 */
export const listLocations = query(async (): Promise<Location[]> => {
    const results = await listQuery({
        table: location,
        featureName: 'locations',
        transform: (row) => ({
            id: row.id,
            userId: row.userId,
            name: row.name,
            address: row.address,
            roomId: row.roomId,
            latitude: row.latitude,
            longitude: row.longitude,
            what3words: row.what3words,
            createdAt: row.createdAt,
            updatedAt: row.updatedAt,
        }),
    });
    return results;
});
