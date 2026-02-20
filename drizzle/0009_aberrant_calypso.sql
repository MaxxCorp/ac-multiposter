ALTER TABLE "event" ALTER COLUMN "start_date_time" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "event" ADD COLUMN "is_all_day" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "event" DROP COLUMN "start_date";--> statement-breakpoint
ALTER TABLE "event" DROP COLUMN "end_date";