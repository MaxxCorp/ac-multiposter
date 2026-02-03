import { query } from '$app/server';
import { announcement } from '$lib/server/db/schema';
import { db } from '$lib/server/db';
import { eq, desc } from 'drizzle-orm';
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
    locationIds?: string[];
    resolvedContact?: {
        name: string;
        email: string;
        phone: string;
        qrCodeDataUrl?: string;
    } | null;
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

/**
 * List all public announcements for Kiosk display
 */
export const listKioskAnnouncements = query(async (): Promise<Announcement[]> => {
    const results = await db.query.announcement.findMany({
        where: eq(announcement.isPublic, true),
        orderBy: [desc(announcement.updatedAt)],
    });

    return results.map(row => ({
        ...row,
        createdAt: row.createdAt.toISOString(),
        updatedAt: row.updatedAt.toISOString(),
    }));
});
