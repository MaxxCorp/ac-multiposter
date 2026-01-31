import { pgTable, text, timestamp, jsonb, boolean, uuid, primaryKey, uniqueIndex } from "drizzle-orm/pg-core";
import { relations } from 'drizzle-orm';
import { user } from "./auth";

/**
 * CMS Pages (e.g. 'imprint', 'gdpr')
 */
export const cmsPage = pgTable("cms_page", {
    slug: text("slug").primaryKey(),
    name: text("name").notNull(),
});

/**
 * CMS Content Blocks (e.g. "Main Imprint Text")
 */
export const cmsBlock = pgTable("cms_block", {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    description: text("description"),
});

/**
 * CMS Page Slots (Mapping blocks to pages)
 */
export const cmsSlot = pgTable("cms_slot", {
    pageSlug: text("page_slug")
        .notNull()
        .references(() => cmsPage.slug, { onDelete: "cascade" }),
    slotName: text("slot_name").notNull(), // e.g. 'main'
    blockId: uuid("block_id")
        .notNull()
        .references(() => cmsBlock.id, { onDelete: "cascade" }),
    isActive: boolean("is_active").default(true).notNull(),
}, (table) => [
    primaryKey({ columns: [table.pageSlug, table.slotName] }), // One active block per slot per page (simplified)
]);

/**
 * CMS Content Versions (Actual Data)
 */
export const cmsContentVersion = pgTable("cms_content_version", {
    id: uuid("id").primaryKey().defaultRandom(),
    blockId: uuid("block_id")
        .notNull()
        .references(() => cmsBlock.id, { onDelete: "cascade" }),
    language: text("language").notNull(), // e.g. 'en', 'de'
    branch: text("branch").notNull(), // 'published', 'draft'
    content: jsonb("content").notNull(), // { html: "..." }
    createdAt: timestamp("created_at").defaultNow().notNull(),
    createdBy: text("created_by")
        .references(() => user.id, { onDelete: "set null" }),
}, (table) => [
    uniqueIndex("cms_content_version_lookup_idx").on(table.blockId, table.language, table.branch),
]);

// Relations
export const cmsSlotRelations = relations(cmsSlot, ({ one }) => ({
    page: one(cmsPage, {
        fields: [cmsSlot.pageSlug],
        references: [cmsPage.slug],
    }),
    block: one(cmsBlock, {
        fields: [cmsSlot.blockId],
        references: [cmsBlock.id],
    }),
}));

export const cmsContentVersionRelations = relations(cmsContentVersion, ({ one }) => ({
    block: one(cmsBlock, {
        fields: [cmsContentVersion.blockId],
        references: [cmsBlock.id],
    }),
    creator: one(user, {
        fields: [cmsContentVersion.createdBy],
        references: [user.id],
    }),
}));
