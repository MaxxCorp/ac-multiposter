import { command } from '$app/server';
import { updateContentSchema } from '$lib/validations/cms';
import { saveContent } from '$lib/server/cms/operations';
import { getAuthenticatedUser, ensureAccess } from '$lib/authorization';

export const updateContent = command(updateContentSchema, async (data) => {
    const user = getAuthenticatedUser();
    // Ensure admin or specific permission
    // Assuming 'admin' role or 'cms' feature claim.
    // For now, check role 'admin'.
    const roles = user.roles as string[] || [];
    if (!roles.includes('admin')) {
        // Or ensureAccess(user, 'cms'); if we added cms feature.
        // User said "authorized users with the admin role".
        if (!roles.includes('admin')) throw new Error('Forbidden');
    }

    const saved = await saveContent(data.blockId, data.language, data.branch, data.content, user.id);
    return { success: true, version: saved };
});
