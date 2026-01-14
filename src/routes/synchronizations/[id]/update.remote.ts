import { command } from '$app/server';
import { getAuthenticatedUser, ensureAccess } from '$lib/authorization';
import { db } from '$lib/server/db';
import { syncConfig } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';
import { updateSynchronizationSchema, type UpdateSynchronizationInput } from '$lib/validations/synchronizations';
export type { UpdateSynchronizationInput };
import { list as listSynchronizations } from '../list.remote';
import { view as viewSynchronization } from './view.remote';

/**
 * Update a sync configuration
 */
export const updateSynchronization = command(updateSynchronizationSchema, async (data) => {
	const user = getAuthenticatedUser();
	ensureAccess(user, 'synchronizations');

	const { id, ...input } = data;

	// Verify ownership
	const [existing] = await db
		.select()
		.from(syncConfig)
		.where(eq(syncConfig.id, id));

	if (!existing) {
		throw new Error('Sync configuration not found');
	}

	// Update config
	const [updated] = await db
		.update(syncConfig)
		.set({
			enabled: input.enabled !== undefined ? (typeof input.enabled === 'string' ? input.enabled === 'true' : !!input.enabled) : existing.enabled,
			settings: input.settings !== undefined ? input.settings : existing.settings,
			updatedAt: new Date()
		})
		.where(eq(syncConfig.id, id))
		.returning();

	await listSynchronizations().refresh();
	await viewSynchronization(id).refresh();

	return updated;
});
