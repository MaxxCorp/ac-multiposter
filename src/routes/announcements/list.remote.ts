import { query } from '$app/server';
import { announcement } from '$lib/server/db/schema';
import { listQuery } from '$lib/server/db/query-helpers';
import type { Announcement as DbAnnouncement } from '$lib/server/db/schema';

/**
 * Announcement interface matching the database schema, with dates serialized to strings
 */
export type Announcement = Omit<DbAnnouncement, 'createdAt' | 'updatedAt'> & {
    createdAt: string;
    updatedAt: string;
    tagIds?: string[];
    tagNames?: string[];
    contactIds?: string[];
};

/**
 * List all announcements for the authenticated user
 */
export const listAnnouncements = query(async (): Promise<Announcement[]> => {
    const results = await listQuery({
        table: announcement,
        featureName: 'announcements', // This should match ensureAccess permission
        transform: (row) => ({
            ...row,
            createdAt: row.createdAt.toISOString(),
            updatedAt: row.updatedAt.toISOString(),
        }),
    });

    return results;
});
