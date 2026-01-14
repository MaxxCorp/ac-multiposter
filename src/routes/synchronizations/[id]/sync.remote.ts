import { command } from '$app/server';
import * as v from 'valibot';
import { getAuthenticatedUser, ensureAccess } from '$lib/authorization';
import { syncService } from '$lib/server/sync/service';
import { view as viewSyncConfig } from './view.remote';

/**
 * Trigger a synchronization for a config
 */
export const sync = command(v.string(), async (configId: string) => {
	const user = getAuthenticatedUser();
	ensureAccess(user, 'synchronizations');

	// Start sync process (non-blocking)
	syncService.syncEvents(configId).catch((error: any) => {
		console.error(`[SyncCommand] Failed to synchronize ${configId}:`, error);
	});

	// Refresh the view query
	await viewSyncConfig(configId).refresh();

	return { success: true };
});
