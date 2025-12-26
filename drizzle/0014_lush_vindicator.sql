CREATE TABLE "email_campaign" (
	"id" text PRIMARY KEY NOT NULL,
	"sync_config_id" text NOT NULL,
	"event_id" text NOT NULL,
	"event_summary" text NOT NULL,
	"brevo_campaign_id" text,
	"sent_at" timestamp DEFAULT now() NOT NULL,
	"recipient_count" integer NOT NULL,
	"metadata" jsonb
);
--> statement-breakpoint
CREATE TABLE "email_event" (
	"id" text PRIMARY KEY NOT NULL,
	"email_campaign_id" text NOT NULL,
	"recipient_email" text NOT NULL,
	"event_type" text NOT NULL,
	"event_data" jsonb,
	"occurred_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "email_campaign" ADD CONSTRAINT "email_campaign_sync_config_id_sync_config_id_fk" FOREIGN KEY ("sync_config_id") REFERENCES "public"."sync_config"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_event" ADD CONSTRAINT "email_event_email_campaign_id_email_campaign_id_fk" FOREIGN KEY ("email_campaign_id") REFERENCES "public"."email_campaign"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "email_campaign_sync_config_id_idx" ON "email_campaign" USING btree ("sync_config_id");--> statement-breakpoint
CREATE INDEX "email_campaign_event_id_idx" ON "email_campaign" USING btree ("event_id");--> statement-breakpoint
CREATE INDEX "email_campaign_sent_at_idx" ON "email_campaign" USING btree ("sent_at");--> statement-breakpoint
CREATE INDEX "email_event_campaign_id_idx" ON "email_event" USING btree ("email_campaign_id");--> statement-breakpoint
CREATE INDEX "email_event_recipient_email_idx" ON "email_event" USING btree ("recipient_email");--> statement-breakpoint
CREATE INDEX "email_event_type_idx" ON "email_event" USING btree ("event_type");--> statement-breakpoint
CREATE INDEX "email_event_occurred_at_idx" ON "email_event" USING btree ("occurred_at");