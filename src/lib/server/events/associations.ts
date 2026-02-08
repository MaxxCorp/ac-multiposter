import { db } from '$lib/server/db';
import { eventLocation, eventResource, eventContact, eventTag, tag } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';

interface AssociationOptions {
    eventId: string;
    userId: string;
    locationIds?: string[];
    resourceIds?: string[];
    contactIds?: string[];
    tags?: string[];
}

export async function updateEventAssociations({
    eventId,
    userId,
    locationIds,
    resourceIds,
    contactIds,
    tags
}: AssociationOptions) {
    // Locations
    if (locationIds !== undefined) {
        await db.delete(eventLocation).where(eq(eventLocation.eventId, eventId));
        if (locationIds.length > 0) {
            await db.insert(eventLocation).values(
                locationIds.map(id => ({ eventId, locationId: id }))
            );
        }
    }

    // Resources
    if (resourceIds !== undefined) {
        await db.delete(eventResource).where(eq(eventResource.eventId, eventId));
        if (resourceIds.length > 0) {
            await db.insert(eventResource).values(
                resourceIds.map(id => ({ eventId, resourceId: id }))
            );
        }
    }

    // Contacts
    if (contactIds !== undefined) {
        await db.delete(eventContact).where(eq(eventContact.eventId, eventId));
        if (contactIds.length > 0) {
            await db.insert(eventContact).values(
                contactIds.map(id => ({ eventId, contactId: id }))
            );
        }
    }

    // Tags
    if (tags !== undefined) {
        // Ensure "Series" tag is added for recurring events? 
        // Logic for "Series" tag usually happens before calling this, based on event state.
        // Or we pass the final list of tags here.
        // We assume `tags` array passed here is the final desired list (including 'Series' if applicable).

        const uniqueTags = [...new Set(tags)];

        await db.delete(eventTag).where(eq(eventTag.eventId, eventId));

        if (uniqueTags.length > 0) {
            for (const name of uniqueTags) {
                // Find or create tag
                // Note: Sequential to avoid race conditions
                let [existingTag] = await db.select().from(tag).where(and(eq(tag.name, name), eq(tag.userId, userId)));
                if (!existingTag) {
                    [existingTag] = await db.insert(tag).values({ name, userId }).returning();
                }
                if (existingTag) {
                    await db.insert(eventTag).values({ eventId, tagId: existingTag.id }).onConflictDoNothing();
                }
            }
        }
    }
}
