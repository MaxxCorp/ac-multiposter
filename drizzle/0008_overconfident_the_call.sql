CREATE TABLE "contact" (
	"id" text PRIMARY KEY NOT NULL,
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
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "contact_address" (
	"id" text PRIMARY KEY NOT NULL,
	"contact_id" text NOT NULL,
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
	"id" text PRIMARY KEY NOT NULL,
	"contact_id" text NOT NULL,
	"value" text NOT NULL,
	"type" text,
	"primary" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "contact_phone" (
	"id" text PRIMARY KEY NOT NULL,
	"contact_id" text NOT NULL,
	"value" text NOT NULL,
	"type" text,
	"primary" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "event_contact" (
	"event_id" text NOT NULL,
	"contact_id" text NOT NULL,
	CONSTRAINT "event_contact_event_id_contact_id_pk" PRIMARY KEY("event_id","contact_id")
);
--> statement-breakpoint
CREATE TABLE "location_contact" (
	"location_id" text NOT NULL,
	"contact_id" text NOT NULL,
	CONSTRAINT "location_contact_location_id_contact_id_pk" PRIMARY KEY("location_id","contact_id")
);
--> statement-breakpoint
CREATE TABLE "resource_contact" (
	"resource_id" text NOT NULL,
	"contact_id" text NOT NULL,
	CONSTRAINT "resource_contact_resource_id_contact_id_pk" PRIMARY KEY("resource_id","contact_id")
);
--> statement-breakpoint
CREATE TABLE "user_contact" (
	"user_id" text NOT NULL,
	"contact_id" text NOT NULL,
	CONSTRAINT "user_contact_user_id_contact_id_pk" PRIMARY KEY("user_id","contact_id")
);
--> statement-breakpoint
ALTER TABLE "contact" ADD CONSTRAINT "contact_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contact_address" ADD CONSTRAINT "contact_address_contact_id_contact_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contact"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contact_email" ADD CONSTRAINT "contact_email_contact_id_contact_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contact"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contact_phone" ADD CONSTRAINT "contact_phone_contact_id_contact_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contact"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_contact" ADD CONSTRAINT "event_contact_event_id_event_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."event"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_contact" ADD CONSTRAINT "event_contact_contact_id_contact_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contact"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "location_contact" ADD CONSTRAINT "location_contact_location_id_location_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."location"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "location_contact" ADD CONSTRAINT "location_contact_contact_id_contact_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contact"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resource_contact" ADD CONSTRAINT "resource_contact_resource_id_resource_id_fk" FOREIGN KEY ("resource_id") REFERENCES "public"."resource"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resource_contact" ADD CONSTRAINT "resource_contact_contact_id_contact_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contact"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_contact" ADD CONSTRAINT "user_contact_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_contact" ADD CONSTRAINT "user_contact_contact_id_contact_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contact"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "contact_user_id_idx" ON "contact" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "contact_address_contact_id_idx" ON "contact_address" USING btree ("contact_id");--> statement-breakpoint
CREATE INDEX "contact_email_contact_id_idx" ON "contact_email" USING btree ("contact_id");--> statement-breakpoint
CREATE INDEX "contact_phone_contact_id_idx" ON "contact_phone" USING btree ("contact_id");--> statement-breakpoint
CREATE INDEX "event_contact_event_idx" ON "event_contact" USING btree ("event_id");--> statement-breakpoint
CREATE INDEX "event_contact_contact_idx" ON "event_contact" USING btree ("contact_id");--> statement-breakpoint
CREATE INDEX "location_contact_location_idx" ON "location_contact" USING btree ("location_id");--> statement-breakpoint
CREATE INDEX "location_contact_contact_idx" ON "location_contact" USING btree ("contact_id");--> statement-breakpoint
CREATE INDEX "resource_contact_resource_idx" ON "resource_contact" USING btree ("resource_id");--> statement-breakpoint
CREATE INDEX "resource_contact_contact_idx" ON "resource_contact" USING btree ("contact_id");--> statement-breakpoint
CREATE INDEX "user_contact_user_idx" ON "user_contact" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "user_contact_contact_idx" ON "user_contact" USING btree ("contact_id");