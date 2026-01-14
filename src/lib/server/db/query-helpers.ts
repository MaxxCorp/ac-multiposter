/**
 * Reusable utility for common database query patterns
 */
import { db } from '$lib/server/db';
import { getAuthenticatedUser, ensureAccess, type Feature } from '$lib/authorization';
import { eq, desc, type SQL } from 'drizzle-orm';
import type { PgTable } from 'drizzle-orm/pg-core';

export interface ListQueryConfig<T extends PgTable> {
	/** The database table to query */
	table: T;
	/** The feature name for access control (e.g., "events", "campaigns") */
	featureName: Feature;
	/** Optional custom order by clause (defaults to desc(table.createdAt)) */
	orderBy?: SQL;
	/** Optional data transformer function */
	transform?: (row: any) => any;
}

/**
 * Standard list query pattern:
 * 1. Authenticate user
 * 2. Check access
 * 3. Query by userId
 * 4. Order by createdAt desc (or custom)
 * 5. Return results
 */
export async function listQuery<T extends PgTable>(config: ListQueryConfig<T>): Promise<any[]> {
	const { table, featureName, orderBy: customOrderBy, transform } = config;

	const user = getAuthenticatedUser();
	ensureAccess(user, featureName);

	const query = db
		.select()
		.from(table as any);

	// Apply ordering
	if (customOrderBy) {
		query.orderBy(customOrderBy);
	} else if ((table as any).createdAt) {
		query.orderBy(desc((table as any).createdAt));
	}

	const results = await query;

	// Apply transformation if provided
	if (transform) {
		return results.map(transform);
	}

	return results;
}

export interface GetQueryConfig<T extends PgTable> {
	/** The database table to query */
	table: T;
	/** The feature name for access control (e.g., "events", "campaigns") */
	featureName: Feature;
	/** The ID of the item to fetch */
	id: string;
	/** Optional data transformer function */
	transform?: (row: any) => any;
}

/**
 * Standard get-by-id query pattern:
 * 1. Authenticate user
 * 2. Check access
 * 3. Query by id AND userId
 * 4. Return result or null
 */
export async function getQuery<T extends PgTable>(config: GetQueryConfig<T>): Promise<any | null> {
	const { table, featureName, id, transform } = config;

	const user = getAuthenticatedUser();
	ensureAccess(user, featureName);

	const results = await db
		.select()
		.from(table as any)
		.where(eq((table as any).id, id))
		.limit(1);

	if (results.length === 0) return null;

	// Apply transformation if provided
	if (transform) {
		return transform(results[0]);
	}

	return results[0];
}
