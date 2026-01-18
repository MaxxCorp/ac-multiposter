import { pgTable, text, timestamp, jsonb, index, integer, uuid } from "drizzle-orm/pg-core";
import { relations } from 'drizzle-orm';
import { user } from "./auth";
import { syncConfig } from "./synchronizations";

export const campaign = pgTable("campaign", {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
        .notNull()
        .references(() => user.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    content: jsonb("content").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
        .defaultNow()
        .$onUpdate(() => /* @__PURE__ */ new Date())
        .notNull(),
}, (table) => [
    index("campaign_user_id_idx").on(table.userId),
]);

/**
 * Email campaigns sent via sync providers
 */
export const emailCampaign = pgTable("email_campaign", {
    id: uuid("id").primaryKey().defaultRandom(),
    syncConfigId: uuid("sync_config_id")
        .notNull()
        .references(() => syncConfig.id, { onDelete: "cascade" }),
    eventId: uuid("event_id"), // The event that was emailed (nullable)
    announcementId: uuid("announcement_id"), // The announcement that was emailed (nullable)
    eventSummary: text("event_summary").notNull(), // Cached summary (event or announcement)
    brevoCampaignId: text("brevo_campaign_id"), // Brevo campaign ID
    sentAt: timestamp("sent_at").defaultNow().notNull(),
    recipientCount: integer("recipient_count").notNull(),
    metadata: jsonb("metadata"), // Additional campaign data
}, (table) => [
    index("email_campaign_sync_config_id_idx").on(table.syncConfigId),
    index("email_campaign_event_id_idx").on(table.eventId),
    index("email_campaign_announcement_id_idx").on(table.announcementId),
    index("email_campaign_sent_at_idx").on(table.sentAt),
]);

/**
 * Individual email events (deliveries, opens, clicks, etc.)
 */
export const emailEvent = pgTable("email_event", {
    id: uuid("id").primaryKey().defaultRandom(),
    emailCampaignId: uuid("email_campaign_id")
        .notNull()
        .references(() => emailCampaign.id, { onDelete: "cascade" }),
    recipientEmail: text("recipient_email").notNull(),
    eventType: text("event_type").notNull(), // 'delivered', 'opened', 'clicked', 'bounced', 'complained', 'unsubscribed'
    eventData: jsonb("event_data"), // Additional event data from Brevo
    occurredAt: timestamp("occurred_at").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
    index("email_event_campaign_id_idx").on(table.emailCampaignId),
    index("email_event_recipient_email_idx").on(table.recipientEmail),
    index("email_event_type_idx").on(table.eventType),
    index("email_event_occurred_at_idx").on(table.occurredAt),
]);

export const campaignRelations = relations(campaign, ({ one }) => ({
    user: one(user, {
        fields: [campaign.userId],
        references: [user.id],
    }),
}));

export const emailCampaignRelations = relations(emailCampaign, ({ one, many }) => ({
    syncConfig: one(syncConfig, {
        fields: [emailCampaign.syncConfigId],
        references: [syncConfig.id],
    }),
    emailEvents: many(emailEvent),
}));

export const emailEventRelations = relations(emailEvent, ({ one }) => ({
    emailCampaign: one(emailCampaign, {
        fields: [emailEvent.emailCampaignId],
        references: [emailCampaign.id],
    }),
}));

export type Campaign = typeof campaign.$inferSelect;
export type CreateCampaignInput = typeof campaign.$inferInsert;
