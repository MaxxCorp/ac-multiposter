CREATE TABLE "announcement" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"title" text NOT NULL,
	"content" text NOT NULL,
	"is_public" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "announcement_contact" (
	"announcement_id" uuid NOT NULL,
	"contact_id" uuid NOT NULL,
	CONSTRAINT "announcement_contact_announcement_id_contact_id_pk" PRIMARY KEY("announcement_id","contact_id")
);
--> statement-breakpoint
CREATE TABLE "announcement_tag" (
	"announcement_id" uuid NOT NULL,
	"tag_id" uuid NOT NULL,
	CONSTRAINT "announcement_tag_announcement_id_tag_id_pk" PRIMARY KEY("announcement_id","tag_id")
);
--> statement-breakpoint
ALTER TABLE "email_campaign" ALTER COLUMN "event_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "sync_mapping" ALTER COLUMN "event_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "email_campaign" ADD COLUMN "announcement_id" uuid;--> statement-breakpoint
ALTER TABLE "sync_mapping" ADD COLUMN "announcement_id" uuid;--> statement-breakpoint
ALTER TABLE "announcement" ADD CONSTRAINT "announcement_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "announcement_contact" ADD CONSTRAINT "announcement_contact_announcement_id_announcement_id_fk" FOREIGN KEY ("announcement_id") REFERENCES "public"."announcement"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "announcement_contact" ADD CONSTRAINT "announcement_contact_contact_id_contact_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contact"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "announcement_tag" ADD CONSTRAINT "announcement_tag_announcement_id_announcement_id_fk" FOREIGN KEY ("announcement_id") REFERENCES "public"."announcement"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "announcement_tag" ADD CONSTRAINT "announcement_tag_tag_id_tag_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."tag"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "announcement_user_id_idx" ON "announcement" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "announcement_contact_announcement_idx" ON "announcement_contact" USING btree ("announcement_id");--> statement-breakpoint
CREATE INDEX "announcement_contact_contact_idx" ON "announcement_contact" USING btree ("contact_id");--> statement-breakpoint
CREATE INDEX "announcement_tag_announcement_idx" ON "announcement_tag" USING btree ("announcement_id");--> statement-breakpoint
CREATE INDEX "announcement_tag_tag_idx" ON "announcement_tag" USING btree ("tag_id");--> statement-breakpoint
CREATE INDEX "email_campaign_announcement_id_idx" ON "email_campaign" USING btree ("announcement_id");--> statement-breakpoint
CREATE INDEX "sync_mapping_announcement_id_idx" ON "sync_mapping" USING btree ("announcement_id");--> statement-breakpoint
CREATE INDEX "sync_mapping_sync_config_id_idx" ON "sync_mapping" USING btree ("sync_config_id");