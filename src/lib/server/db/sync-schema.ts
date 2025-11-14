import { pgTable, text, timestamp, boolean, jsonb, integer, index } from "drizzle-orm/pg-core";
import { user } from "./schema";

/**
 * Sync provider configurations - each represents a configured sync connection
 */
export const syncConfig = pgTable("sync_config", {
	id: text("id").primaryKey(),
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
}, (table) => ({
	syncConfigUserIndex: index("sync_config_user_id_idx").on(table.userId),
}));

/**
 * Tracks individual sync operations for auditing and retry
 */
export const syncOperation = pgTable("sync_operation", {
	id: text("id").primaryKey(),
	syncConfigId: text("sync_config_id")
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
}, (table) => ({
	syncOperationConfigIndex: index("sync_operation_config_id_idx").on(table.syncConfigId),
	syncOperationConfigStartedIndex: index("sync_operation_config_started_idx").on(
		table.syncConfigId,
		table.startedAt,
	),
}));

/**
 * Maps internal events to external provider events
 */
export const syncMapping = pgTable("sync_mapping", {
	id: text("id").primaryKey(),
	eventId: text("event_id").notNull(), // References event.id
	syncConfigId: text("sync_config_id")
		.notNull()
		.references(() => syncConfig.id, { onDelete: "cascade" }),
	externalId: text("external_id").notNull(), // Provider's event ID
	providerId: text("provider_id").notNull(), // Matches syncConfig.providerId
	lastSyncedAt: timestamp("last_synced_at").defaultNow().notNull(),
	etag: text("etag"), // For conflict detection
	metadata: jsonb("metadata"), // Provider-specific metadata
}, (table) => ({
	syncMappingEventIndex: index("sync_mapping_event_id_idx").on(table.eventId),
	syncMappingLookupIndex: index("sync_mapping_sync_external_idx").on(
		table.syncConfigId,
		table.externalId,
	),
}));

/**
 * Webhook subscriptions for push notifications
 */
export const webhookSubscription = pgTable("webhook_subscription", {
	id: text("id").primaryKey(),
	syncConfigId: text("sync_config_id")
		.notNull()
		.references(() => syncConfig.id, { onDelete: "cascade" }),
	providerId: text("provider_id").notNull(),
	resourceId: text("resource_id").notNull(), // Provider's resource identifier
	channelId: text("channel_id").notNull(), // Unique channel identifier
	expiresAt: timestamp("expires_at").notNull(),
	createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
	webhookSubscriptionConfigIndex: index("webhook_subscription_sync_config_id_idx").on(
		table.syncConfigId,
	),
	webhookSubscriptionExpiresIndex: index("webhook_subscription_expires_at_idx").on(table.expiresAt),
}));
