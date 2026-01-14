import { command, query } from '$app/server';
import * as v from 'valibot';
import { getAuthenticatedUser, ensureAccess } from '$lib/authorization';
import { syncService } from '$lib/server/sync/service';
import { view as viewSyncConfig } from './view.remote';

/**
 * Check webhook status
 */
export const checkStatus = query(v.string(), async (configId: string) => {
    const user = getAuthenticatedUser();
    ensureAccess(user, 'synchronizations');

    return await syncService.checkWebhookStatus(configId);
});

/**
 * Register a webhook
 */
export const register = command(v.string(), async (configId: string) => {
    const user = getAuthenticatedUser();
    ensureAccess(user, 'synchronizations');

    await syncService.setupWebhook(configId);

    // Refresh views
    await viewSyncConfig(configId).refresh();

    // Return new status
    return await syncService.checkWebhookStatus(configId);
});

/**
 * Unregister a webhook
 */
export const unregister = command(v.string(), async (configId: string) => {
    const user = getAuthenticatedUser();
    ensureAccess(user, 'synchronizations');

    await syncService.removeWebhook(configId);

    // Refresh views
    await viewSyncConfig(configId).refresh();

    // Return new status
    return await syncService.checkWebhookStatus(configId);
});

