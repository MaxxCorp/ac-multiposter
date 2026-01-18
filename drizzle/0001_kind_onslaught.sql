CREATE TABLE "kiosk" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"location_id" uuid NOT NULL,
	"loop_duration" integer DEFAULT 5 NOT NULL,
	"look_ahead" integer DEFAULT 2419200 NOT NULL,
	"look_past" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "kiosk" ADD CONSTRAINT "kiosk_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kiosk" ADD CONSTRAINT "kiosk_location_id_location_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."location"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "kiosk_user_id_idx" ON "kiosk" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "kiosk_location_id_idx" ON "kiosk" USING btree ("location_id");