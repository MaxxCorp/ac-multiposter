ALTER TABLE "event" ADD COLUMN "is_public" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "event" ADD COLUMN "qr_code_path" text;--> statement-breakpoint
ALTER TABLE "event" ADD COLUMN "ical_path" text;