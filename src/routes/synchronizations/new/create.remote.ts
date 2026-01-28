import * as v from 'valibot';
import { form } from '$app/server';
import { getAuthenticatedUser, ensureAccess } from '$lib/authorization';
import { db } from '$lib/server/db';
import { syncConfig, account } from '$lib/server/db/schema'; // Updated syncConfig import path
import { eq, and } from 'drizzle-orm';
import { syncService } from '$lib/server/sync/service';
import { createSynchronizationSchema } from '$lib/validations/synchronizations';
import { list as listSynchronizations } from '../list.remote'; // New import



export const create = form(createSynchronizationSchema, async (input) => {
	console.log('--- createSynchronization START ---');
	console.log('Data received:', JSON.stringify(input, null, 2));

	try {
		const user = getAuthenticatedUser();
		ensureAccess(user, 'synchronizations');
		console.log('User authenticated:', user.id);

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
				.where(and(eq(account.userId, user.id), eq(account.providerId, oauthProviderId)))
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
		const settings = typeof input.settings === 'string' ? JSON.parse(input.settings) : (input.settings || {});

		const insertData: any = {
			userId: user.id,
			providerId: input.providerId,
			providerType: input.providerType,
			direction: input.direction,
			enabled: true,
			credentials,
			settings,
			createdAt: new Date(),
			updatedAt: new Date()
		};

		console.log('Insert payload:', insertData);

		const [config] = await db
			.insert(syncConfig)
			.values(insertData)
			.returning();

		if (!config) {
			throw new Error('Failed to create synchronization configuration');
		}

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

		await listSynchronizations().refresh();

		console.log('--- createSynchronization SUCCESS ---');
		return { success: true, synchronization: config };
	} catch (err: any) {
		console.error('--- createSynchronization ERROR ---', err);
		return { success: false, error: { message: err.message || 'Creation failed' } };
	}
});
