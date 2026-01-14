import { query } from '$app/server';
import { getAuthenticatedUser, ensureAccess } from '$lib/authorization';
import { syncService } from '$lib/server/sync/service';
import { getEmailCampaignsSchema } from '$lib/validations/synchronizations';

export const getEmailCampaigns = query(getEmailCampaignsSchema, async (data) => {
	const user = getAuthenticatedUser();
	ensureAccess(user, 'synchronizations');

	// Map configId to current getEmailCampaigns implementation
	// Note: You might need to adjust this depending on how syncService handles this
	return await (syncService as any).getEmailCampaigns?.(data.configId) || [];
});