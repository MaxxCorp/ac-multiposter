import { query } from '$app/server';
import { location } from '$lib/server/db/schema';
import { listQuery } from '$lib/server/db/query-helpers';

export interface Location {
    id: string;
    userId: string;
    name: string;
    street: string | null;
    houseNumber: string | null;
    addressSuffix: string | null;
    zip: string | null;
    city: string | null;
    state: string | null;
    country: string | null;
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
            ...row,
        }),
    });
    return results;
});
