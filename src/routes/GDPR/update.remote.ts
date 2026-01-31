import { command } from '$app/server';
import { updateContentSchema } from '$lib/validations/cms';
import { saveContent } from '$lib/server/cms/operations';
import { getAuthenticatedUser } from '$lib/authorization';

export const updateContent = command(updateContentSchema, async (data) => {
    const user = getAuthenticatedUser();
    const roles = user.roles as string[] || [];
    if (!roles.includes('admin')) throw new Error('Forbidden');

    const saved = await saveContent(data.blockId, data.language, data.branch, data.content, user.id);
    return { success: true, version: saved };
});
