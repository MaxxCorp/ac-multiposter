import { db } from '$lib/server/db';
import { cmsBlock, cmsSlot, cmsContentVersion, cmsPage } from '$lib/server/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { error } from '@sveltejs/kit';
import { getAuthenticatedUser, ensureAccess } from '$lib/authorization';

/**
 * Get content for a specific page slot.
 * Falls back: `(lang, branch)` -> `('en', branch)` -> first available for branch.
 */
export async function getContent(pageSlug: string, slotName: string, language: string, branch: string = 'published') {
    // 1. Find active block for slot
    // We strictly use the composite key logic: pageSlug + slotName
    // Since our schema has (pageSlug, slotName) PK, there's only one row per slot.
    const slot = await db.query.cmsSlot.findFirst({
        where: and(
            eq(cmsSlot.pageSlug, pageSlug),
            eq(cmsSlot.slotName, slotName),
            eq(cmsSlot.isActive, true)
        ),
        with: {
            block: true
        }
    });

    if (!slot) return null;

    const blockId = slot.blockId;

    // 2. Fetch versions for this block and branch
    const versions = await db.query.cmsContentVersion.findMany({
        where: and(
            eq(cmsContentVersion.blockId, blockId),
            eq(cmsContentVersion.branch, branch)
        ),
        orderBy: [desc(cmsContentVersion.createdAt)]
    });

    if (versions.length === 0) return { block: slot.block, content: null };

    // 3. Find best match
    // Exact match
    const exact = versions.find(v => v.language === language);
    if (exact) return { block: slot.block, content: exact };

    // Fallback to 'en'
    const fallbackEn = versions.find(v => v.language === 'en');
    if (fallbackEn) return { block: slot.block, content: fallbackEn };

    // Fallback to whatever is first (latest)
    return { block: slot.block, content: versions[0] };
}

/**
 * Create a new block (and optionally link it)
 */
export async function createBlock(name: string, description?: string) {
    const [block] = await db.insert(cmsBlock).values({
        name,
        description
    }).returning();
    return block;
}

/**
 * Link a block to a slot
 */
export async function linkBlock(pageSlug: string, slotName: string, blockId: string) {
    // Ensure page exists
    await db.insert(cmsPage).values({ slug: pageSlug, name: pageSlug }).onConflictDoNothing();

    // Upsert slot
    await db.insert(cmsSlot).values({
        pageSlug,
        slotName,
        blockId,
        isActive: true
    }).onConflictDoUpdate({
        target: [cmsSlot.pageSlug, cmsSlot.slotName],
        set: { blockId, isActive: true }
    });
}

/**
 * Save new content version
 */
export async function saveContent(blockId: string, language: string, branch: string, content: string, userId?: string) {
    // We use `jsonb` for content, so wrap the string.
    // CKEditor returns HTML string.
    const contentJson = { html: content };

    // Check if a version already exists for (block, lang, branch).
    // If we want history, we insert new. If we want "latest draft" only, we update or upsert.
    // The simplified requirement implies "versioning" but usually draft is a single mutable tip, or specific history.
    // Let's implement "Overwrite current branch tip" for simplicity unless "history" is strictly requested.
    // User said: "support versioning... e.g. for unpublished drafts".
    // Schema has `uniqueIndex("cms_content_version_lookup_idx").on(table.blockId, table.language, table.branch)`.
    // This enforces ONE row per (block, lang, branch).
    // So "History" is NOT supported by this schema, only "Latest Draft" and "Latest Published".
    // This matches "simplified CMS".

    const [saved] = await db.insert(cmsContentVersion).values({
        blockId,
        language,
        branch,
        content: contentJson,
        createdBy: userId
    }).onConflictDoUpdate({
        target: [cmsContentVersion.blockId, cmsContentVersion.language, cmsContentVersion.branch],
        set: {
            content: contentJson,
            createdAt: new Date(), // touch timestamp
            createdBy: userId
        }
    }).returning();

    return saved;
}

export async function deleteBlock(blockId: string) {
    // Cascade should handle slots and versions
    await db.delete(cmsBlock).where(eq(cmsBlock.id, blockId));
}

export async function getBlock(blockId: string) {
    return db.query.cmsBlock.findFirst({
        where: eq(cmsBlock.id, blockId)
    });
}

export async function listBlocks() {
    return db.query.cmsBlock.findMany({
        orderBy: [desc(cmsBlock.name)]
    });
}

export async function renameBlock(blockId: string, newName: string) {
    await db.update(cmsBlock)
        .set({ name: newName })
        .where(eq(cmsBlock.id, blockId));
}
