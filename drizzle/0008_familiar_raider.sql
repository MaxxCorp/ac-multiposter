ALTER TABLE "sync_mapping" ADD COLUMN "location_id" uuid;--> statement-breakpoint
ALTER TABLE "sync_mapping" ADD COLUMN "contact_id" uuid;--> statement-breakpoint
ALTER TABLE "sync_mapping" ADD COLUMN "tag_id" uuid;--> statement-breakpoint
CREATE INDEX "sync_mapping_location_id_idx" ON "sync_mapping" USING btree ("location_id");--> statement-breakpoint
CREATE INDEX "sync_mapping_contact_id_idx" ON "sync_mapping" USING btree ("contact_id");--> statement-breakpoint
CREATE INDEX "sync_mapping_tag_id_idx" ON "sync_mapping" USING btree ("tag_id");