import { query } from '$app/server';
import { z } from 'zod/mini';
import { getAuthenticatedUser, ensureAccess } from '$lib/authorization';
import { db } from '$lib/server/db';
import { syncConfig, syncOperation } from '$lib/server/db/sync-schema';
import { eq, and, desc } from 'drizzle-orm';
import { getQuery } from '$lib/server/db/query-helpers';

/**
 * Get a single sync configuration by ID
 */
export const view = query(z.string(), async (id: string) => {
	const config = await getQuery({
		table: syncConfig,
		featureName: 'synchronizations',
		id,
	});

	if (!config) {
		throw new Error('Sync configuration not found');
	}

	return config;
});

/**
 * Get recent sync operations for a config
 */
export const getOperations = query(z.string(), async (configId: string) => {
	const user = getAuthenticatedUser();
	ensureAccess(user, 'synchronizations');

	// Verify ownership
	const [config] = await db
		.select()
		.from(syncConfig)
		.where(and(eq(syncConfig.id, configId), eq(syncConfig.userId, user.id)));

	if (!config) {
		throw new Error('Sync configuration not found');
	}

	// Get recent operations
	const operations = await db
		.select()
		.from(syncOperation)
		.where(eq(syncOperation.syncConfigId, configId))
		.orderBy(desc(syncOperation.startedAt))
		.limit(20);

	return operations;
});
