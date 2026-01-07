import { command } from '$app/server';
import { getAuthenticatedUser, ensureAccess } from '$lib/authorization';
import { db } from '$lib/server/db';
import { syncConfig } from '$lib/server/db/sync-schema';
import { account } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import crypto from 'crypto';
import type { SyncDirection } from '$lib/server/sync/types';
import { syncService } from '$lib/server/sync/service';
import { CreateSyncSchema, type CreateSyncInput } from '$lib/validations/sync';
export type { CreateSyncInput };


export const create = command(CreateSyncSchema, async (input) => {
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
	const [config] = await db
		.insert(syncConfig)
		.values({
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

	const newConfigId = config.id;

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

	return config;
});
