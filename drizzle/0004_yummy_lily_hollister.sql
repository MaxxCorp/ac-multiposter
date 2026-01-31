CREATE TABLE "cms_block" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text
);
--> statement-breakpoint
CREATE TABLE "cms_content_version" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"block_id" uuid NOT NULL,
	"language" text NOT NULL,
	"branch" text NOT NULL,
	"content" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"created_by" text
);
--> statement-breakpoint
CREATE TABLE "cms_page" (
	"slug" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cms_slot" (
	"page_slug" text NOT NULL,
	"slot_name" text NOT NULL,
	"block_id" uuid NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	CONSTRAINT "cms_slot_page_slug_slot_name_pk" PRIMARY KEY("page_slug","slot_name")
);
--> statement-breakpoint
ALTER TABLE "cms_content_version" ADD CONSTRAINT "cms_content_version_block_id_cms_block_id_fk" FOREIGN KEY ("block_id") REFERENCES "public"."cms_block"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cms_content_version" ADD CONSTRAINT "cms_content_version_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cms_slot" ADD CONSTRAINT "cms_slot_page_slug_cms_page_slug_fk" FOREIGN KEY ("page_slug") REFERENCES "public"."cms_page"("slug") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cms_slot" ADD CONSTRAINT "cms_slot_block_id_cms_block_id_fk" FOREIGN KEY ("block_id") REFERENCES "public"."cms_block"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "cms_content_version_lookup_idx" ON "cms_content_version" USING btree ("block_id","language","branch");