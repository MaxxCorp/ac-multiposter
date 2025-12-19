import { command } from '$app/server';
import { z } from 'zod/mini';
import { getAuthenticatedUser, ensureAccess } from '$lib/authorization';
import { db } from '$lib/server/db';
import { syncConfig } from '$lib/server/db/sync-schema';
import { account } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import crypto from 'crypto';
import type { SyncDirection } from '$lib/server/sync/types';
import { syncService } from '$lib/server/sync/service';

export interface CreateSyncInput {
	providerType: 'google-calendar' | 'microsoft-calendar' | 'berlin-de-main-calendar' | 'wp-the-events-calendar';
	providerId: string;
	direction: SyncDirection;
	settings?: {
		calendarId?: string;
		syncIntervalMinutes?: number;
		company?: string;
		fieldMappings?: Record<string, string>;
		baseUrl?: string;
		username?: string;
		applicationPassword?: string;
	};
}

const createSyncSchema = z.object({
	providerType: z.enum(['google-calendar', 'microsoft-calendar', 'berlin-de-main-calendar', 'wp-the-events-calendar']),
	providerId: z.string(),
	direction: z.enum(['pull', 'push', 'bidirectional']),
	settings: z.optional(
		z.object({
			calendarId: z.optional(z.string()),
			syncIntervalMinutes: z.optional(z.number()),
			company: z.optional(z.string()),
			fieldMappings: z.optional(z.record(z.string(), z.string())),
			baseUrl: z.optional(z.string()),
			username: z.optional(z.string()),
			applicationPassword: z.optional(z.string())
		})
	)
});

/**
 * Create a new sync configuration
 */
export const create = command(createSyncSchema, async (input) => {
	const user = getAuthenticatedUser();
	ensureAccess(user, 'synchronizations');

	// Find the user's OAuth account for the selected provider (if OAuth-based)
	const providerIdMap: Record<string, string> = {
		'google-calendar': 'google',
		'microsoft-calendar': 'microsoft'
	};

	const oauthProviderId = providerIdMap[input.providerType];
	let credentials: any = null;

	if (oauthProviderId) {
		// OAuth-based provider - verify account exists
		const [userAccount] = await db
			.select()
			.from(account)
			.where(eq(account.userId, user.id) && eq(account.providerId, oauthProviderId))
			.limit(1);

		if (!userAccount) {
			throw new Error(
				`No ${oauthProviderId} account connected. Please connect your account in settings first.`
			);
		}

		credentials = {
			accessToken: userAccount.accessToken,
			refreshToken: userAccount.refreshToken,
			expiresAt: userAccount.accessTokenExpiresAt?.getTime()
		};
	}

	// Create sync config
	const newConfigId = crypto.randomUUID();
	const config = await db
		.insert(syncConfig)
		.values({
			id: newConfigId,
			userId: user.id,
			providerId: input.providerId,
			providerType: input.providerType,
			direction: input.direction,
			enabled: true,
			credentials,
			settings: input.settings || {},
			createdAt: new Date(),
			updatedAt: new Date()
		})
		.returning();

	// Setup webhook for push notifications if direction is pull or bidirectional
	if (input.direction === 'pull' || input.direction === 'bidirectional') {
		try {
			await syncService.setupWebhook(newConfigId);
		} catch (error: any) {
			console.error(`[CreateSync] Failed to setup webhook:`, error);
			// Don't fail the sync creation if webhook setup fails
			// User can still manually sync or retry webhook setup later
		}
	}

	return config[0];
});
