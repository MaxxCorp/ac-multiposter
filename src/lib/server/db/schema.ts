import { pgTable, text, timestamp, jsonb, index } from "drizzle-orm/pg-core";
import { user } from "./auth-schema";

// Re-export auth schemas
export { user, session, account, verification } from "./auth-schema";

export const campaign = pgTable("campaign", {
  id: text("id").primaryKey(),
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
}, (table) => ({
  campaignUserIndex: index("campaign_user_id_idx").on(table.userId),
}));

// Re-export event schema
export { event } from "./events-schema";

// Re-export sync schemas
export { syncConfig, syncOperation, syncMapping, webhookSubscription } from "./sync-schema";

// Re-export resource schemas
export { location, resource, resourceRelation, eventResource } from "./resources-schema";

// Re-export contact schemas
export {
  contact, contactEmail, contactPhone, contactAddress,
  userContact, locationContact, resourceContact, eventContact,
  contactRelation, tag, contactTag,
  contactRelations, contactEmailRelations, contactPhoneRelations, contactAddressRelations,
  contactRelationRelations, tagRelations, contactTagRelations
} from "./contacts-schema";
