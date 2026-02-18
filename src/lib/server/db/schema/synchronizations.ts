import { pgTable, text, timestamp, boolean, jsonb, integer, index, uuid } from "drizzle-orm/pg-core";
import { relations } from 'drizzle-orm';
import { user } from "./auth";

/**
 * Sync provider configurations - each represents a configured sync connection
 */
export const syncConfig = pgTable("sync_config", {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
        .notNull()
        .references(() => user.id, { onDelete: "cascade" }),
    providerId: text("provider_id").notNull(), // e.g., 'google-calendar-work', 'google-calendar-personal'
    providerType: text("provider_type").notNull(), // 'google-calendar', 'microsoft-calendar', etc.
    direction: text("direction").notNull(), // 'pull', 'push', 'bidirectional'
    enabled: boolean("enabled").default(true).notNull(),
    credentials: jsonb("credentials"), // Encrypted tokens, keys, etc.
    settings: jsonb("settings"), // Provider-specific settings
    lastSyncAt: timestamp("last_sync_at"),
    nextSyncAt: timestamp("next_sync_at"),
    syncToken: text("sync_token"), // For incremental syncs
    webhookId: text("webhook_id"), // Associated webhook subscription ID
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
        .defaultNow()
        .$onUpdate(() => new Date())
        .notNull(),
}, (table) => [
    index("sync_config_user_id_idx").on(table.userId),
]);

/**
 * Tracks individual sync operations for auditing and retry
 */
export const syncOperation = pgTable("sync_operation", {
    id: uuid("id").primaryKey().defaultRandom(),
    syncConfigId: uuid("sync_config_id")
        .notNull()
        .references(() => syncConfig.id, { onDelete: "cascade" }),
    operation: text("operation").notNull(), // 'pull', 'push', 'delete'
    status: text("status").notNull(), // 'pending', 'completed', 'failed'
    entityType: text("entity_type").notNull(), // 'event'
    entityId: text("entity_id"), // Internal entity ID
    externalId: text("external_id"), // Provider's entity ID
    error: text("error"),
    startedAt: timestamp("started_at").defaultNow().notNull(),
    completedAt: timestamp("completed_at"),
    retryCount: integer("retry_count").default(0).notNull(),
}, (table) => [
    index("sync_operation_config_id_idx").on(table.syncConfigId),
    index("sync_operation_config_started_idx").on(
        table.syncConfigId,
        table.startedAt,
    ),
]);

/**
 * Maps internal events to external provider events
 */
export const syncMapping = pgTable("sync_mapping", {
    id: uuid("id").primaryKey().defaultRandom(),
    eventId: uuid("event_id"), // References event.id (which is now uuid)
    announcementId: uuid('announcement_id'),
    syncConfigId: uuid("sync_config_id")
        .notNull()
        .references(() => syncConfig.id, { onDelete: "cascade" }),
    externalId: text("external_id").notNull(), // Provider's event ID
    providerId: text("provider_id").notNull(), // Matches syncConfig.providerId
    lastSyncedAt: timestamp("last_synced_at").defaultNow().notNull(),
    etag: text("etag"), // For conflict detection
    metadata: jsonb("metadata"), // Provider-specific metadata
    locationId: uuid("location_id"), // Linked location/venue
    contactId: uuid("contact_id"), // Linked contact/organizer
    tagId: uuid("tag_id"), // Linked tag
}, (table) => [
    index("sync_mapping_event_id_idx").on(table.eventId),
    index("sync_mapping_location_id_idx").on(table.locationId),
    index("sync_mapping_contact_id_idx").on(table.contactId),
    index("sync_mapping_tag_id_idx").on(table.tagId),
    index('sync_mapping_announcement_id_idx').on(table.announcementId),
    index('sync_mapping_sync_config_id_idx').on(table.syncConfigId),
    index("sync_mapping_lookup_index").on(
        table.syncConfigId,
        table.externalId,
    ),
]);

/**
 * Webhook subscriptions for push notifications
 */
export const webhookSubscription = pgTable("webhook_subscription", {
    id: uuid("id").primaryKey().defaultRandom(),
    syncConfigId: uuid("sync_config_id")
        .notNull()
        .references(() => syncConfig.id, { onDelete: "cascade" }),
    providerId: text("provider_id").notNull(),
    resourceId: text("resource_id").notNull(), // Provider's resource identifier
    channelId: text("channel_id").notNull(), // Unique channel identifier
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
    index("webhook_subscription_sync_config_id_idx").on(
        table.syncConfigId,
    ),
    index("webhook_subscription_expires_at_idx").on(table.expiresAt),
]);
