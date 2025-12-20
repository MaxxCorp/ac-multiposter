ALTER TABLE "contact" ADD COLUMN "is_public" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "contact" ADD COLUMN "vcard_path" text;--> statement-breakpoint
ALTER TABLE "contact" ADD COLUMN "qrcode_path" text;