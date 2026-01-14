import { command } from '$app/server';
import * as v from 'valibot';
import { getAuthenticatedUser, ensureAccess } from '$lib/authorization';
import { db } from '$lib/server/db';
import { syncConfig } from '$lib/server/db/schema';
import { eq, and, inArray } from 'drizzle-orm';
import { syncService } from '$lib/server/sync/service';
import { list as listSynchronizations } from '../list.remote';

/**
 * Delete a sync configuration
 */
export const remove = command(v.string(), async (id: string) => {
	const user = getAuthenticatedUser();
	ensureAccess(user, 'synchronizations');

	// Verify ownership
	const [existing] = await db
		.select()
		.from(syncConfig)
		.where(eq(syncConfig.id, id));

	if (!existing) {
		throw new Error('Sync configuration not found');
	}

	// Cancel webhook if one exists
	if (existing.webhookId) {
		try {
			await syncService.cancelWebhook(id);
		} catch (error: any) {
			console.error(`[DeleteSync] Failed to cancel webhook:`, error);
			// Continue with deletion even if webhook cancellation fails
		}
	}

	// Delete (cascade will handle related records)
	await db.delete(syncConfig).where(eq(syncConfig.id, id));

	await listSynchronizations().refresh();

	return { success: true };
});

/**
 * Bulk delete sync configurations
 */
export const removeBulk = command(v.array(v.string()), async (ids: string[]) => {
	const user = getAuthenticatedUser();
	ensureAccess(user, 'synchronizations');

	if (ids.length === 0) {
		return { success: true, deleted: 0 };
	}

	// Get configs to cancel their webhooks
	const configs = await db
		.select()
		.from(syncConfig)
		.where(inArray(syncConfig.id, ids));

	// Cancel webhooks for configs that have them
	for (const config of configs) {
		if (config.webhookId) {
			try {
				await syncService.cancelWebhook(config.id);
			} catch (error: any) {
				console.error(`[BulkDeleteSync] Failed to cancel webhook for ${config.id}:`, error);
				// Continue with other deletions
			}
		}
	}

	// Delete all matching configs (ownership checked via where clause)
	await db
		.delete(syncConfig)
		.where(inArray(syncConfig.id, ids));

	await listSynchronizations().refresh();

	return { success: true };
});

