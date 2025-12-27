import { command, query } from '$app/server';
import { z } from 'zod/mini';
import { getAuthenticatedUser, ensureAccess } from '$lib/authorization';
import { syncService } from '$lib/server/sync/service';

/**
 * Check webhook status for a sync configuration
 */
export const checkStatus = query(z.string(), async (configId: string) => {
    const user = getAuthenticatedUser();
    ensureAccess(user, 'synchronizations');

    return await syncService.checkWebhookStatus(configId);
});

/**
 * Register webhook for a sync configuration
 */
export const register = command(z.string(), async (configId: string) => {
    const user = getAuthenticatedUser();
    ensureAccess(user, 'synchronizations');

    await syncService.setupWebhook(configId);
    return await syncService.checkWebhookStatus(configId);
});

/**
 * Unregister webhook for a sync configuration
 */
export const unregister = command(z.string(), async (configId: string) => {
    const user = getAuthenticatedUser();
    ensureAccess(user, 'synchronizations');

    await syncService.removeWebhook(configId);
    return await syncService.checkWebhookStatus(configId);
});
