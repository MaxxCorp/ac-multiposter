CREATE TABLE "event_resource" (
	"event_id" text NOT NULL,
	"resource_id" text NOT NULL,
	CONSTRAINT "event_resource_event_id_resource_id_pk" PRIMARY KEY("event_id","resource_id")
);
--> statement-breakpoint
CREATE TABLE "location" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"address" text,
	"room_id" text,
	"latitude" double precision,
	"longitude" double precision,
	"what3words" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "resource" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"location_id" text,
	"name" text NOT NULL,
	"description" text,
	"type" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "resource_relation" (
	"parent_resource_id" text NOT NULL,
	"child_resource_id" text NOT NULL,
	CONSTRAINT "resource_relation_parent_resource_id_child_resource_id_pk" PRIMARY KEY("parent_resource_id","child_resource_id")
);
--> statement-breakpoint
ALTER TABLE "event_resource" ADD CONSTRAINT "event_resource_event_id_event_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."event"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_resource" ADD CONSTRAINT "event_resource_resource_id_resource_id_fk" FOREIGN KEY ("resource_id") REFERENCES "public"."resource"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "location" ADD CONSTRAINT "location_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resource" ADD CONSTRAINT "resource_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resource" ADD CONSTRAINT "resource_location_id_location_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."location"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resource_relation" ADD CONSTRAINT "resource_relation_parent_resource_id_resource_id_fk" FOREIGN KEY ("parent_resource_id") REFERENCES "public"."resource"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resource_relation" ADD CONSTRAINT "resource_relation_child_resource_id_resource_id_fk" FOREIGN KEY ("child_resource_id") REFERENCES "public"."resource"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "event_resource_event_idx" ON "event_resource" USING btree ("event_id");--> statement-breakpoint
CREATE INDEX "event_resource_resource_idx" ON "event_resource" USING btree ("resource_id");--> statement-breakpoint
CREATE INDEX "location_user_id_idx" ON "location" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "resource_user_id_idx" ON "resource" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "resource_location_id_idx" ON "resource" USING btree ("location_id");--> statement-breakpoint
CREATE INDEX "resource_relation_parent_idx" ON "resource_relation" USING btree ("parent_resource_id");--> statement-breakpoint
CREATE INDEX "resource_relation_child_idx" ON "resource_relation" USING btree ("child_resource_id");