ALTER TABLE "location" RENAME COLUMN "address" TO "street";--> statement-breakpoint
ALTER TABLE "location" ADD COLUMN "house_number" text;--> statement-breakpoint
ALTER TABLE "location" ADD COLUMN "address_suffix" text;--> statement-breakpoint
ALTER TABLE "location" ADD COLUMN "zip" text;--> statement-breakpoint
ALTER TABLE "location" ADD COLUMN "city" text;--> statement-breakpoint
ALTER TABLE "location" ADD COLUMN "state" text;--> statement-breakpoint
ALTER TABLE "location" ADD COLUMN "country" text;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "phone_number" text;