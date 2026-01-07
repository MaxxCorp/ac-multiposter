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
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"content" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "contact" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"display_name" text,
	"given_name" text,
	"family_name" text,
	"middle_name" text,
	"honorific_prefix" text,
	"honorific_suffix" text,
	"birthday" timestamp,
	"gender" text,
	"notes" text,
	"is_public" boolean DEFAULT false NOT NULL,
	"vcard_path" text,
	"qrcode_path" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "contact_address" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"contact_id" uuid NOT NULL,
	"street" text,
	"house_number" text,
	"address_suffix" text,
	"zip" text,
	"city" text,
	"state" text,
	"country" text,
	"type" text,
	"primary" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "contact_email" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"contact_id" uuid NOT NULL,
	"value" text NOT NULL,
	"type" text,
	"primary" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "contact_phone" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"contact_id" uuid NOT NULL,
	"value" text NOT NULL,
	"type" text,
	"primary" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "contact_relation" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"contact_id" uuid NOT NULL,
	"target_contact_id" uuid NOT NULL,
	"relation_type" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "contact_tag" (
	"contact_id" uuid NOT NULL,
	"tag_id" uuid NOT NULL,
	CONSTRAINT "contact_tag_contact_id_tag_id_pk" PRIMARY KEY("contact_id","tag_id")
);
--> statement-breakpoint
CREATE TABLE "email_campaign" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sync_config_id" uuid NOT NULL,
	"event_id" uuid NOT NULL,
	"event_summary" text NOT NULL,
	"brevo_campaign_id" text,
	"sent_at" timestamp DEFAULT now() NOT NULL,
	"recipient_count" integer NOT NULL,
	"metadata" jsonb
);
--> statement-breakpoint
CREATE TABLE "email_event" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email_campaign_id" uuid NOT NULL,
	"recipient_email" text NOT NULL,
	"event_type" text NOT NULL,
	"event_data" jsonb,
	"occurred_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "event" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
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
	"categoryBerlinDotDe" text,
	"ticketPrice" text,
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
	"guests_can_see_other_guests" boolean DEFAULT false,
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
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"is_public" boolean DEFAULT false NOT NULL,
	"qr_code_path" text,
	"ical_path" text
);
--> statement-breakpoint
CREATE TABLE "event_contact" (
	"event_id" uuid NOT NULL,
	"contact_id" uuid NOT NULL,
	"participation_status" text DEFAULT 'needsAction' NOT NULL,
	CONSTRAINT "event_contact_event_id_contact_id_pk" PRIMARY KEY("event_id","contact_id")
);
--> statement-breakpoint
CREATE TABLE "event_resource" (
	"event_id" uuid NOT NULL,
	"resource_id" uuid NOT NULL,
	CONSTRAINT "event_resource_event_id_resource_id_pk" PRIMARY KEY("event_id","resource_id")
);
--> statement-breakpoint
CREATE TABLE "location" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"street" text,
	"house_number" text,
	"address_suffix" text,
	"zip" text,
	"city" text,
	"state" text,
	"country" text,
	"room_id" text,
	"latitude" double precision,
	"longitude" double precision,
	"what3words" text,
	"inclusivity_support" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "location_contact" (
	"location_id" uuid NOT NULL,
	"contact_id" uuid NOT NULL,
	CONSTRAINT "location_contact_location_id_contact_id_pk" PRIMARY KEY("location_id","contact_id")
);
--> statement-breakpoint
CREATE TABLE "resource" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"location_id" uuid,
	"name" text NOT NULL,
	"description" text,
	"type" text NOT NULL,
	"allocation_calendars" jsonb,
	"max_occupancy" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "resource_contact" (
	"resource_id" uuid NOT NULL,
	"contact_id" uuid NOT NULL,
	CONSTRAINT "resource_contact_resource_id_contact_id_pk" PRIMARY KEY("resource_id","contact_id")
);
--> statement-breakpoint
CREATE TABLE "resource_relation" (
	"parent_resource_id" uuid NOT NULL,
	"child_resource_id" uuid NOT NULL,
	CONSTRAINT "resource_relation_parent_resource_id_child_resource_id_pk" PRIMARY KEY("parent_resource_id","child_resource_id")
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
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
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
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" uuid NOT NULL,
	"sync_config_id" uuid NOT NULL,
	"external_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"last_synced_at" timestamp DEFAULT now() NOT NULL,
	"etag" text,
	"metadata" jsonb
);
--> statement-breakpoint
CREATE TABLE "sync_operation" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sync_config_id" uuid NOT NULL,
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
CREATE TABLE "tag" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"user_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
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
CREATE TABLE "user_contact" (
	"user_id" text NOT NULL,
	"contact_id" uuid NOT NULL,
	CONSTRAINT "user_contact_user_id_contact_id_pk" PRIMARY KEY("user_id","contact_id")
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
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sync_config_id" uuid NOT NULL,
	"provider_id" text NOT NULL,
	"resource_id" text NOT NULL,
	"channel_id" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign" ADD CONSTRAINT "campaign_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contact" ADD CONSTRAINT "contact_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contact_address" ADD CONSTRAINT "contact_address_contact_id_contact_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contact"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contact_email" ADD CONSTRAINT "contact_email_contact_id_contact_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contact"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contact_phone" ADD CONSTRAINT "contact_phone_contact_id_contact_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contact"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contact_relation" ADD CONSTRAINT "contact_relation_contact_id_contact_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contact"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contact_relation" ADD CONSTRAINT "contact_relation_target_contact_id_contact_id_fk" FOREIGN KEY ("target_contact_id") REFERENCES "public"."contact"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contact_tag" ADD CONSTRAINT "contact_tag_contact_id_contact_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contact"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contact_tag" ADD CONSTRAINT "contact_tag_tag_id_tag_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."tag"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_campaign" ADD CONSTRAINT "email_campaign_sync_config_id_sync_config_id_fk" FOREIGN KEY ("sync_config_id") REFERENCES "public"."sync_config"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_event" ADD CONSTRAINT "email_event_email_campaign_id_email_campaign_id_fk" FOREIGN KEY ("email_campaign_id") REFERENCES "public"."email_campaign"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event" ADD CONSTRAINT "event_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_contact" ADD CONSTRAINT "event_contact_event_id_event_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."event"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_contact" ADD CONSTRAINT "event_contact_contact_id_contact_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contact"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_resource" ADD CONSTRAINT "event_resource_event_id_event_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."event"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_resource" ADD CONSTRAINT "event_resource_resource_id_resource_id_fk" FOREIGN KEY ("resource_id") REFERENCES "public"."resource"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "location" ADD CONSTRAINT "location_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "location_contact" ADD CONSTRAINT "location_contact_location_id_location_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."location"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "location_contact" ADD CONSTRAINT "location_contact_contact_id_contact_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contact"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resource" ADD CONSTRAINT "resource_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resource" ADD CONSTRAINT "resource_location_id_location_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."location"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resource_contact" ADD CONSTRAINT "resource_contact_resource_id_resource_id_fk" FOREIGN KEY ("resource_id") REFERENCES "public"."resource"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resource_contact" ADD CONSTRAINT "resource_contact_contact_id_contact_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contact"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resource_relation" ADD CONSTRAINT "resource_relation_parent_resource_id_resource_id_fk" FOREIGN KEY ("parent_resource_id") REFERENCES "public"."resource"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resource_relation" ADD CONSTRAINT "resource_relation_child_resource_id_resource_id_fk" FOREIGN KEY ("child_resource_id") REFERENCES "public"."resource"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sync_config" ADD CONSTRAINT "sync_config_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sync_mapping" ADD CONSTRAINT "sync_mapping_sync_config_id_sync_config_id_fk" FOREIGN KEY ("sync_config_id") REFERENCES "public"."sync_config"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sync_operation" ADD CONSTRAINT "sync_operation_sync_config_id_sync_config_id_fk" FOREIGN KEY ("sync_config_id") REFERENCES "public"."sync_config"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tag" ADD CONSTRAINT "tag_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_contact" ADD CONSTRAINT "user_contact_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_contact" ADD CONSTRAINT "user_contact_contact_id_contact_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contact"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webhook_subscription" ADD CONSTRAINT "webhook_subscription_sync_config_id_sync_config_id_fk" FOREIGN KEY ("sync_config_id") REFERENCES "public"."sync_config"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "account_user_provider_id_idx" ON "account" USING btree ("user_id","provider_id");--> statement-breakpoint
CREATE INDEX "campaign_user_id_idx" ON "campaign" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "contact_user_id_idx" ON "contact" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "contact_address_contact_id_idx" ON "contact_address" USING btree ("contact_id");--> statement-breakpoint
CREATE INDEX "contact_email_contact_id_idx" ON "contact_email" USING btree ("contact_id");--> statement-breakpoint
CREATE INDEX "contact_phone_contact_id_idx" ON "contact_phone" USING btree ("contact_id");--> statement-breakpoint
CREATE INDEX "contact_relation_contact_idx" ON "contact_relation" USING btree ("contact_id");--> statement-breakpoint
CREATE INDEX "contact_relation_target_idx" ON "contact_relation" USING btree ("target_contact_id");--> statement-breakpoint
CREATE INDEX "contact_tag_contact_idx" ON "contact_tag" USING btree ("contact_id");--> statement-breakpoint
CREATE INDEX "contact_tag_tag_idx" ON "contact_tag" USING btree ("tag_id");--> statement-breakpoint
CREATE INDEX "email_campaign_sync_config_id_idx" ON "email_campaign" USING btree ("sync_config_id");--> statement-breakpoint
CREATE INDEX "email_campaign_event_id_idx" ON "email_campaign" USING btree ("event_id");--> statement-breakpoint
CREATE INDEX "email_campaign_sent_at_idx" ON "email_campaign" USING btree ("sent_at");--> statement-breakpoint
CREATE INDEX "email_event_campaign_id_idx" ON "email_event" USING btree ("email_campaign_id");--> statement-breakpoint
CREATE INDEX "email_event_recipient_email_idx" ON "email_event" USING btree ("recipient_email");--> statement-breakpoint
CREATE INDEX "email_event_type_idx" ON "email_event" USING btree ("event_type");--> statement-breakpoint
CREATE INDEX "email_event_occurred_at_idx" ON "email_event" USING btree ("occurred_at");--> statement-breakpoint
CREATE INDEX "event_user_id_idx" ON "event" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "event_contact_event_idx" ON "event_contact" USING btree ("event_id");--> statement-breakpoint
CREATE INDEX "event_contact_contact_idx" ON "event_contact" USING btree ("contact_id");--> statement-breakpoint
CREATE INDEX "event_resource_event_idx" ON "event_resource" USING btree ("event_id");--> statement-breakpoint
CREATE INDEX "event_resource_resource_idx" ON "event_resource" USING btree ("resource_id");--> statement-breakpoint
CREATE INDEX "location_user_id_idx" ON "location" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "location_contact_location_idx" ON "location_contact" USING btree ("location_id");--> statement-breakpoint
CREATE INDEX "location_contact_contact_idx" ON "location_contact" USING btree ("contact_id");--> statement-breakpoint
CREATE INDEX "resource_user_id_idx" ON "resource" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "resource_location_id_idx" ON "resource" USING btree ("location_id");--> statement-breakpoint
CREATE INDEX "resource_contact_resource_idx" ON "resource_contact" USING btree ("resource_id");--> statement-breakpoint
CREATE INDEX "resource_contact_contact_idx" ON "resource_contact" USING btree ("contact_id");--> statement-breakpoint
CREATE INDEX "resource_relation_parent_idx" ON "resource_relation" USING btree ("parent_resource_id");--> statement-breakpoint
CREATE INDEX "resource_relation_child_idx" ON "resource_relation" USING btree ("child_resource_id");--> statement-breakpoint
CREATE INDEX "session_user_id_idx" ON "session" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "sync_config_user_id_idx" ON "sync_config" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "sync_mapping_event_id_idx" ON "sync_mapping" USING btree ("event_id");--> statement-breakpoint
CREATE INDEX "sync_mapping_lookup_index" ON "sync_mapping" USING btree ("sync_config_id","external_id");--> statement-breakpoint
CREATE INDEX "sync_operation_config_id_idx" ON "sync_operation" USING btree ("sync_config_id");--> statement-breakpoint
CREATE INDEX "sync_operation_config_started_idx" ON "sync_operation" USING btree ("sync_config_id","started_at");--> statement-breakpoint
CREATE INDEX "tag_user_idx" ON "tag" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "tag_name_user_idx" ON "tag" USING btree ("user_id","name");--> statement-breakpoint
CREATE INDEX "user_contact_user_idx" ON "user_contact" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "user_contact_contact_idx" ON "user_contact" USING btree ("contact_id");--> statement-breakpoint
CREATE INDEX "verification_identifier_idx" ON "verification" USING btree ("identifier");--> statement-breakpoint
CREATE INDEX "webhook_subscription_sync_config_id_idx" ON "webhook_subscription" USING btree ("sync_config_id");--> statement-breakpoint
CREATE INDEX "webhook_subscription_expires_at_idx" ON "webhook_subscription" USING btree ("expires_at");