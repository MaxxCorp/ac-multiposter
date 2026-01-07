ALTER TABLE "account" ALTER COLUMN "id" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "account" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();--> statement-breakpoint
ALTER TABLE "account" ALTER COLUMN "user_id" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "campaign" ALTER COLUMN "id" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "campaign" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();--> statement-breakpoint
ALTER TABLE "campaign" ALTER COLUMN "user_id" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "contact" ALTER COLUMN "id" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "contact" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();--> statement-breakpoint
ALTER TABLE "contact" ALTER COLUMN "user_id" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "contact_address" ALTER COLUMN "id" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "contact_address" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();--> statement-breakpoint
ALTER TABLE "contact_address" ALTER COLUMN "contact_id" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "contact_email" ALTER COLUMN "id" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "contact_email" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();--> statement-breakpoint
ALTER TABLE "contact_email" ALTER COLUMN "contact_id" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "contact_phone" ALTER COLUMN "id" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "contact_phone" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();--> statement-breakpoint
ALTER TABLE "contact_phone" ALTER COLUMN "contact_id" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "contact_relation" ALTER COLUMN "id" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "contact_relation" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();--> statement-breakpoint
ALTER TABLE "contact_relation" ALTER COLUMN "contact_id" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "contact_relation" ALTER COLUMN "target_contact_id" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "contact_tag" ALTER COLUMN "contact_id" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "contact_tag" ALTER COLUMN "tag_id" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "email_campaign" ALTER COLUMN "id" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "email_campaign" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();--> statement-breakpoint
ALTER TABLE "email_campaign" ALTER COLUMN "sync_config_id" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "email_campaign" ALTER COLUMN "event_id" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "email_event" ALTER COLUMN "id" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "email_event" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();--> statement-breakpoint
ALTER TABLE "email_event" ALTER COLUMN "email_campaign_id" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "event" ALTER COLUMN "id" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "event" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();--> statement-breakpoint
ALTER TABLE "event" ALTER COLUMN "user_id" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "event_contact" ALTER COLUMN "event_id" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "event_contact" ALTER COLUMN "contact_id" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "event_resource" ALTER COLUMN "event_id" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "event_resource" ALTER COLUMN "resource_id" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "location" ALTER COLUMN "id" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "location" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();--> statement-breakpoint
ALTER TABLE "location" ALTER COLUMN "user_id" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "location_contact" ALTER COLUMN "location_id" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "location_contact" ALTER COLUMN "contact_id" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "resource" ALTER COLUMN "id" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "resource" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();--> statement-breakpoint
ALTER TABLE "resource" ALTER COLUMN "user_id" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "resource" ALTER COLUMN "location_id" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "resource_contact" ALTER COLUMN "resource_id" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "resource_contact" ALTER COLUMN "contact_id" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "resource_relation" ALTER COLUMN "parent_resource_id" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "resource_relation" ALTER COLUMN "child_resource_id" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "session" ALTER COLUMN "id" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "session" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();--> statement-breakpoint
ALTER TABLE "session" ALTER COLUMN "user_id" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "sync_config" ALTER COLUMN "id" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "sync_config" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();--> statement-breakpoint
ALTER TABLE "sync_config" ALTER COLUMN "user_id" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "sync_mapping" ALTER COLUMN "id" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "sync_mapping" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();--> statement-breakpoint
ALTER TABLE "sync_mapping" ALTER COLUMN "event_id" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "sync_mapping" ALTER COLUMN "sync_config_id" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "sync_operation" ALTER COLUMN "id" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "sync_operation" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();--> statement-breakpoint
ALTER TABLE "sync_operation" ALTER COLUMN "sync_config_id" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "tag" ALTER COLUMN "id" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "tag" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();--> statement-breakpoint
ALTER TABLE "tag" ALTER COLUMN "user_id" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "user" ALTER COLUMN "id" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "user" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();--> statement-breakpoint
ALTER TABLE "user_contact" ALTER COLUMN "user_id" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "user_contact" ALTER COLUMN "contact_id" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "verification" ALTER COLUMN "id" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "verification" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();--> statement-breakpoint
ALTER TABLE "webhook_subscription" ALTER COLUMN "id" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "webhook_subscription" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();--> statement-breakpoint
ALTER TABLE "webhook_subscription" ALTER COLUMN "sync_config_id" SET DATA TYPE uuid;