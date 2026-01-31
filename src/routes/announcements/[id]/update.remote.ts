import { form } from '$app/server';
import { db } from '$lib/server/db';
import { announcement, announcementTag, announcementContact, tag, announcementLocation } from '$lib/server/db/schema';
import { updateAnnouncementSchema } from '$lib/validations/announcements';
import { getAuthenticatedUser, ensureAccess } from '$lib/authorization';
import { publishAnnouncementChange } from '$lib/server/realtime';
import { listAnnouncements } from '../list.remote';
import { readAnnouncement } from './read.remote';
import { eq } from 'drizzle-orm';

/**
 * Command: Update an existing announcement
 */
export const updateExistingAnnouncement = form(updateAnnouncementSchema, async (input) => {
    try {
        const user = getAuthenticatedUser();
        ensureAccess(user, 'announcements');

        const announcementId = input.id;
        const now = new Date();

        // Parse IDs
        let tagIds: string[] | undefined;
        if (typeof input.tagIds === 'string') {
            try { tagIds = JSON.parse(input.tagIds); } catch (e) { }
        } else if (Array.isArray(input.tagIds)) {
            tagIds = input.tagIds;
        }

        let contactIds: string[] | undefined;
        if (input.contactIds !== undefined) {
            if (typeof input.contactIds === 'string') {
                try { contactIds = JSON.parse(input.contactIds); } catch (e) { }
            }
        }

        // Parse tagNames (new approach)
        let tagNames: string[] | undefined;
        if (input.tagNames !== undefined && typeof input.tagNames === 'string') {
            try { tagNames = JSON.parse(input.tagNames); } catch (e) { }
        }

        // Handle isPublic boolean/string conversion if present
        const isPublic = input.isPublic === undefined
            ? undefined
            : (input.isPublic === true || input.isPublic === 'true');

        await db.transaction(async (tx) => {
            // Update Announcement
            await tx.update(announcement)
                .set({
                    title: input.title,
                    content: input.content,
                    ...(isPublic !== undefined ? { isPublic } : {}),
                    updatedAt: now,
                })
                .where(eq(announcement.id, announcementId));

            // Update Tags if provided (either via IDs or Names)
            if (tagIds !== undefined || tagNames !== undefined) {
                // Delete existing
                await tx.delete(announcementTag).where(eq(announcementTag.announcementId, announcementId));

                const finalTagIds = new Set<string>(tagIds || []);

                // Process tag names (find or create)
                if (tagNames && tagNames.length > 0) {
                    for (const tagName of tagNames) {
                        const existingTag = await tx.query.tag.findFirst({
                            where: (t, { eq }) => eq(t.name, tagName)
                        });

                        if (existingTag) {
                            finalTagIds.add(existingTag.id);
                        } else {
                            const [newTag] = await tx.insert(tag).values({
                                name: tagName,
                                userId: user.id
                            }).returning({ id: tag.id });
                            finalTagIds.add(newTag.id);
                        }
                    }
                }

                // Insert new
                if (finalTagIds.size > 0) {
                    await tx.insert(announcementTag).values(
                        [...finalTagIds].map(tagId => ({
                            announcementId: announcementId,
                            tagId: tagId
                        }))
                    );
                }
            }

            // Update Contacts if provided
            if (contactIds !== undefined) {
                // Delete existing
                await tx.delete(announcementContact).where(eq(announcementContact.announcementId, announcementId));
                // Insert new
                if (contactIds.length > 0) {
                    await tx.insert(announcementContact).values(
                        contactIds.map(contactId => ({
                            announcementId: announcementId,
                            contactId: contactId
                        }))
                    );
                }
            }

            // Update Locations if provided
            if (input.locationIds !== undefined) {
                const locationIds = typeof input.locationIds === 'string' ? JSON.parse(input.locationIds) : input.locationIds;
                // Delete existing
                await tx.delete(announcementLocation).where(eq(announcementLocation.announcementId, announcementId));
                // Insert new
                if (locationIds && Array.isArray(locationIds) && locationIds.length > 0) {
                    await tx.insert(announcementLocation).values(
                        (locationIds as string[]).map(locationId => ({
                            announcementId: announcementId,
                            locationId: locationId
                        }))
                    );
                }
            }
        });

        // Notify listeners
        await publishAnnouncementChange('update', [announcementId]);

        // Refresh caches
        await (listAnnouncements() as any).refresh();
        await (readAnnouncement as any).refresh(announcementId);

        return {
            success: true,
            id: announcementId
        };
    } catch (error: any) {
        if (error?.status && error?.location) {
            throw error;
        }

        return {
            success: false,
            error: error?.message || 'An unexpected error occurred'
        };
    }
});
