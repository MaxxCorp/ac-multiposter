import { command } from '$app/server';
import { getAuthenticatedUser, ensureAccess } from '$lib/authorization';
import { db } from '$lib/server/db';
import { syncConfig } from '$lib/server/db/sync-schema';
import { eq, and } from 'drizzle-orm';
import { UpdateSyncSchema, type UpdateSyncInput } from '$lib/validations/sync';
export type { UpdateSyncInput };


/**
 * Update a sync configuration
 */
export const update = command(UpdateSyncSchema, async ({ id, input }) => {
	const user = getAuthenticatedUser();
	ensureAccess(user, 'synchronizations');

	// Verify ownership
	const [existing] = await db
		.select()
		.from(syncConfig)
		.where(and(eq(syncConfig.id, id), eq(syncConfig.userId, user.id)));

	if (!existing) {
		throw new Error('Sync configuration not found');
	}

	// Update config
	const [updated] = await db
		.update(syncConfig)
		.set({
			enabled: input.enabled ?? existing.enabled,
			settings: input.settings ?? existing.settings,
			updatedAt: new Date()
		})
		.where(eq(syncConfig.id, id))
		.returning();

	return updated;
});
