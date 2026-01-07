import { pgTable, text, timestamp, jsonb, index, integer, uuid } from "drizzle-orm/pg-core";
import { user } from "./auth-schema";
import { syncConfig } from "./sync-schema";
import { contact, tag } from "./contacts-schema";
import { location, resource } from "./resources-schema";
import { session, account } from "./auth-schema";
import { event } from "./events-schema";

// Re-export auth schemas
export {
  user, session, account, verification,
  sessionRelations, accountRelations
} from "./auth-schema";

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
  eventId: uuid("event_id").notNull(), // The event that was emailed (now uuid)
  eventSummary: text("event_summary").notNull(), // Cached event summary
  brevoCampaignId: text("brevo_campaign_id"), // Brevo campaign ID
  sentAt: timestamp("sent_at").defaultNow().notNull(),
  recipientCount: integer("recipient_count").notNull(),
  metadata: jsonb("metadata"), // Additional campaign data
}, (table) => [
  index("email_campaign_sync_config_id_idx").on(table.syncConfigId),
  index("email_campaign_event_id_idx").on(table.eventId),
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

import { relations } from 'drizzle-orm';

// relations are handled in schema.ts to avoid cyclical dependencies and conflicts
export const userRelations = relations(user, ({ many }) => ({
  sessions: many(session),
  accounts: many(account),
  campaigns: many(campaign),
  contacts: many(contact),
  tags: many(tag),
  events: many(event),
  locations: many(location),
  resources: many(resource),
}));

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


// Re-export event schema
export { event, eventRelations } from "./events-schema";

// Re-export sync schemas
export { syncConfig, syncOperation, syncMapping, webhookSubscription } from "./sync-schema";

// Re-export resource schemas
export {
  location, resource, resourceRelation, eventResource,
  locationRelations, resourceRelations, resourceRelationRelations, eventResourceRelations
} from "./resources-schema";

// Re-export contact schemas
export {
  contact, contactEmail, contactPhone, contactAddress,
  userContact, locationContact, resourceContact, eventContact,
  contactRelation, tag, contactTag,
  contactRelations, contactEmailRelations, contactPhoneRelations, contactAddressRelations,
  contactRelationRelations, tagRelations, contactTagRelations,
  userContactRelations, locationContactRelations, resourceContactRelations, eventContactRelations
} from "./contacts-schema";
