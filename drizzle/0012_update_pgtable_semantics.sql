DROP INDEX "sync_mapping_sync_external_idx";--> statement-breakpoint
CREATE INDEX "sync_mapping_lookup_index" ON "sync_mapping" USING btree ("sync_config_id","external_id");