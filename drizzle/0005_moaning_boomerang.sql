CREATE TABLE "announcement_location" (
	"announcement_id" uuid NOT NULL,
	"location_id" uuid NOT NULL,
	CONSTRAINT "announcement_location_announcement_id_location_id_pk" PRIMARY KEY("announcement_id","location_id")
);
--> statement-breakpoint
CREATE TABLE "event_location" (
	"event_id" uuid NOT NULL,
	"location_id" uuid NOT NULL,
	CONSTRAINT "event_location_event_id_location_id_pk" PRIMARY KEY("event_id","location_id")
);
--> statement-breakpoint
CREATE TABLE "kiosk_location" (
	"kiosk_id" uuid NOT NULL,
	"location_id" uuid NOT NULL,
	CONSTRAINT "kiosk_location_kiosk_id_location_id_pk" PRIMARY KEY("kiosk_id","location_id")
);
--> statement-breakpoint
ALTER TABLE "event" DROP CONSTRAINT "event_location_id_location_id_fk";
--> statement-breakpoint
ALTER TABLE "kiosk" DROP CONSTRAINT "kiosk_location_id_location_id_fk";
--> statement-breakpoint
DROP INDEX "kiosk_location_id_idx";--> statement-breakpoint
ALTER TABLE "announcement_location" ADD CONSTRAINT "announcement_location_announcement_id_announcement_id_fk" FOREIGN KEY ("announcement_id") REFERENCES "public"."announcement"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "announcement_location" ADD CONSTRAINT "announcement_location_location_id_location_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."location"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_location" ADD CONSTRAINT "event_location_event_id_event_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."event"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_location" ADD CONSTRAINT "event_location_location_id_location_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."location"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kiosk_location" ADD CONSTRAINT "kiosk_location_kiosk_id_kiosk_id_fk" FOREIGN KEY ("kiosk_id") REFERENCES "public"."kiosk"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kiosk_location" ADD CONSTRAINT "kiosk_location_location_id_location_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."location"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "announcement_location_announcement_idx" ON "announcement_location" USING btree ("announcement_id");--> statement-breakpoint
CREATE INDEX "announcement_location_location_idx" ON "announcement_location" USING btree ("location_id");--> statement-breakpoint
CREATE INDEX "event_location_event_idx" ON "event_location" USING btree ("event_id");--> statement-breakpoint
CREATE INDEX "event_location_location_idx" ON "event_location" USING btree ("location_id");--> statement-breakpoint
CREATE INDEX "kiosk_location_kiosk_idx" ON "kiosk_location" USING btree ("kiosk_id");--> statement-breakpoint
CREATE INDEX "kiosk_location_location_idx" ON "kiosk_location" USING btree ("location_id");--> statement-breakpoint
ALTER TABLE "event" DROP COLUMN "location_id";--> statement-breakpoint
ALTER TABLE "kiosk" DROP COLUMN "location_id";