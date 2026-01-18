import { query } from '$app/server';
import { db } from '$lib/server/db';
import { announcement, announcementTag, announcementContact, tag } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';
import type { Announcement } from '../list.remote';
import { getAuthenticatedUser, ensureAccess } from '$lib/authorization';
import * as v from 'valibot';

import { getRequestEvent } from '$app/server';

/**
 * Query: Read an announcement by ID
 */
export const readAnnouncement = query(v.string(), async (announcementId: string): Promise<Announcement | null> => {
    const event = getRequestEvent();
    const user = event.locals.user;


    const [result] = await db
        .select()
        .from(announcement)
        .where(and(
            eq(announcement.id, announcementId),
        ));

    if (!result) return null;

    if (!result.isPublic) {
        if (!user) throw new Error('Unauthorized');
        ensureAccess(user, 'announcements');
    }

    // Fetch related tags and contacts
    // Fetch related tags and contacts
    const tags = await db
        .select({ id: announcementTag.tagId, name: tag.name })
        .from(announcementTag)
        .leftJoin(tag, eq(announcementTag.tagId, tag.id))
        .where(eq(announcementTag.announcementId, announcementId));

    const contacts = await db
        .select({ id: announcementContact.contactId })
        .from(announcementContact)
        .where(eq(announcementContact.announcementId, announcementId));

    return {
        ...result,
        createdAt: result.createdAt.toISOString(),
        updatedAt: result.updatedAt.toISOString(),
        tagIds: tags.map(t => t.id),
        tagNames: tags.map(t => t.name).filter(n => n !== null) as string[],
        contactIds: contacts.map(c => c.id),
    } as Announcement;
});
