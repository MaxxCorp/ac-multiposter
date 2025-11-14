DROP INDEX "account_user_id_idx";--> statement-breakpoint
CREATE INDEX "account_user_provider_id_idx" ON "account" USING btree ("user_id","provider_id");--> statement-breakpoint
CREATE INDEX "campaign_user_id_idx" ON "campaign" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "event_user_id_idx" ON "event" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "sync_config_user_id_idx" ON "sync_config" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "sync_mapping_event_id_idx" ON "sync_mapping" USING btree ("event_id");--> statement-breakpoint
CREATE INDEX "sync_mapping_sync_external_idx" ON "sync_mapping" USING btree ("sync_config_id","external_id");--> statement-breakpoint
CREATE INDEX "sync_operation_config_id_idx" ON "sync_operation" USING btree ("sync_config_id");--> statement-breakpoint
CREATE INDEX "sync_operation_config_started_idx" ON "sync_operation" USING btree ("sync_config_id","started_at");--> statement-breakpoint
CREATE INDEX "webhook_subscription_sync_config_id_idx" ON "webhook_subscription" USING btree ("sync_config_id");--> statement-breakpoint
CREATE INDEX "webhook_subscription_expires_at_idx" ON "webhook_subscription" USING btree ("expires_at");