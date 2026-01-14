import { query } from '$app/server';
import * as v from 'valibot';
import { getAuthenticatedUser, ensureAccess } from '$lib/authorization';
import { db } from '$lib/server/db';
import { syncConfig, syncOperation } from '$lib/server/db/schema';
import { eq, and, desc } from 'drizzle-orm';

/**
 * Query: Get a sync configuration and its recent logs
 */
export const view = query(v.string(), async (id: string) => {
	const user = getAuthenticatedUser();
	ensureAccess(user, 'synchronizations');

	const [config] = await db
		.select()
		.from(syncConfig)
		.where(eq(syncConfig.id, id));

	if (!config) {
		throw new Error('Sync configuration not found');
	}

	return config;
});

/**
 * Query: Get recent sync logs for a configuration
 */
export const getOperations = query(v.string(), async (configId: string) => {
	const user = getAuthenticatedUser();
	ensureAccess(user, 'synchronizations');

	return await db
		.select()
		.from(syncOperation)
		.where(eq(syncOperation.syncConfigId, configId))
		.orderBy(desc(syncOperation.startedAt))
		.limit(50);
});
