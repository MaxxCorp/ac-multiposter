CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp,
	"refresh_token_expires_at" timestamp,
	"scope" text,
	"password" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "campaign" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"content" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "event" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"google_event_id" text,
	"google_calendar_id" text,
	"ical_uid" text,
	"etag" text,
	"html_link" text,
	"summary" text NOT NULL,
	"description" text,
	"location" text,
	"color_id" text,
	"event_type" text DEFAULT 'default' NOT NULL,
	"status" text DEFAULT 'confirmed' NOT NULL,
	"start_date" text,
	"start_date_time" timestamp,
	"start_time_zone" text,
	"end_date" text,
	"end_date_time" timestamp,
	"end_time_zone" text,
	"end_time_unspecified" boolean DEFAULT false,
	"recurrence" jsonb,
	"recurring_event_id" text,
	"original_start_time" jsonb,
	"visibility" text DEFAULT 'default',
	"transparency" text DEFAULT 'opaque',
	"creator" jsonb,
	"organizer" jsonb,
	"attendees" jsonb,
	"attendees_omitted" boolean DEFAULT false,
	"guests_can_invite_others" boolean DEFAULT true,
	"guests_can_modify" boolean DEFAULT false,
	"guests_can_see_other_guests" boolean DEFAULT true,
	"anyone_can_add_self" boolean DEFAULT false,
	"reminders" jsonb,
	"conference_data" jsonb,
	"hangout_link" text,
	"attachments" jsonb,
	"extended_properties" jsonb,
	"working_location_properties" jsonb,
	"out_of_office_properties" jsonb,
	"focus_time_properties" jsonb,
	"birthday_properties" jsonb,
	"source" jsonb,
	"locked" boolean DEFAULT false,
	"private_copy" boolean DEFAULT false,
	"sequence" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "sync_config" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"provider_type" text NOT NULL,
	"direction" text NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"credentials" jsonb,
	"settings" jsonb,
	"last_sync_at" timestamp,
	"next_sync_at" timestamp,
	"sync_token" text,
	"webhook_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sync_mapping" (
	"id" text PRIMARY KEY NOT NULL,
	"event_id" text NOT NULL,
	"sync_config_id" text NOT NULL,
	"external_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"last_synced_at" timestamp DEFAULT now() NOT NULL,
	"etag" text,
	"metadata" jsonb
);
--> statement-breakpoint
CREATE TABLE "sync_operation" (
	"id" text PRIMARY KEY NOT NULL,
	"sync_config_id" text NOT NULL,
	"operation" text NOT NULL,
	"status" text NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" text,
	"external_id" text,
	"error" text,
	"started_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp,
	"retry_count" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"roles" jsonb,
	"claims" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "webhook_subscription" (
	"id" text PRIMARY KEY NOT NULL,
	"sync_config_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"resource_id" text NOT NULL,
	"channel_id" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign" ADD CONSTRAINT "campaign_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event" ADD CONSTRAINT "event_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sync_config" ADD CONSTRAINT "sync_config_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sync_mapping" ADD CONSTRAINT "sync_mapping_sync_config_id_sync_config_id_fk" FOREIGN KEY ("sync_config_id") REFERENCES "public"."sync_config"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sync_operation" ADD CONSTRAINT "sync_operation_sync_config_id_sync_config_id_fk" FOREIGN KEY ("sync_config_id") REFERENCES "public"."sync_config"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webhook_subscription" ADD CONSTRAINT "webhook_subscription_sync_config_id_sync_config_id_fk" FOREIGN KEY ("sync_config_id") REFERENCES "public"."sync_config"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "account_user_id_idx" ON "account" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "session_user_id_idx" ON "session" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "verification_identifier_idx" ON "verification" USING btree ("identifier");