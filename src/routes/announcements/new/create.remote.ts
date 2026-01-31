import { form } from '$app/server';
import { db } from '$lib/server/db';
import { announcement, announcementTag, announcementContact, tag, announcementLocation } from '$lib/server/db/schema';
import { createAnnouncementSchema } from '$lib/validations/announcements';
import { getAuthenticatedUser, ensureAccess } from '$lib/authorization';
import { publishAnnouncementChange } from '$lib/server/realtime';
import { listAnnouncements } from '../list.remote';
import { v4 as uuidv4 } from 'uuid';

/**
 * Command: Create a new announcement
 */
export const createNewAnnouncement = form(createAnnouncementSchema, async (input) => {
    try {
        const user = getAuthenticatedUser();
        ensureAccess(user, 'announcements');

        const announcementId = uuidv4();
        const now = new Date();

        // Parse IDs
        let tagIds: string[] = [];
        if (typeof input.tagIds === 'string') {
            try { tagIds = JSON.parse(input.tagIds); } catch (e) { }
        } else if (Array.isArray(input.tagIds)) {
            tagIds = input.tagIds;
        }

        // Parse tagNames (new approach)
        let tagNames: string[] = [];
        if (typeof input.tagNames === 'string') {
            try { tagNames = JSON.parse(input.tagNames); } catch (e) { }
        }

        let contactIds: string[] = [];
        if (typeof input.contactIds === 'string') {
            try { contactIds = JSON.parse(input.contactIds); } catch (e) { }
        }

        // Handle isPublic boolean/string conversion
        const isPublic = input.isPublic === true || input.isPublic === 'true';

        await db.transaction(async (tx) => {
            // Insert Announcement
            await tx.insert(announcement).values({
                id: announcementId,
                userId: user.id,
                title: input.title,
                content: input.content,
                isPublic: isPublic,
                createdAt: now,
                updatedAt: now,
            });

            // Insert Tags
            const finalTagIds = new Set<string>(tagIds);

            // Process tag names (find or create)
            if (tagNames.length > 0) {
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

            if (finalTagIds.size > 0) {
                await tx.insert(announcementTag).values(
                    [...finalTagIds].map(tagId => ({
                        announcementId: announcementId,
                        tagId: tagId
                    }))
                );
            }

            // Insert Contacts
            if (contactIds.length > 0) {
                await tx.insert(announcementContact).values(
                    contactIds.map(contactId => ({
                        announcementId: announcementId,
                        contactId: contactId
                    }))
                );
            }

            // Insert Locations
            const locationIds = typeof input.locationIds === 'string' ? JSON.parse(input.locationIds) : input.locationIds;
            if (locationIds && Array.isArray(locationIds) && locationIds.length > 0) {
                await tx.insert(announcementLocation).values(
                    (locationIds as string[]).map(locationId => ({
                        announcementId: announcementId,
                        locationId: locationId
                    }))
                );
            }
        });

        // Notify listeners
        await publishAnnouncementChange('create', [announcementId]);

        // Refresh list cache if applicable
        await (listAnnouncements() as any).refresh();

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
