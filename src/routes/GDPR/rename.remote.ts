import { command } from '$app/server';
import { renameBlockSchema } from '$lib/validations/cms';
import { renameBlock } from '$lib/server/cms/operations';
import { getAuthenticatedUser } from '$lib/authorization';

export const renameBlockFunction = command(renameBlockSchema, async (data) => {
    const user = getAuthenticatedUser();
    const roles = user.roles as string[] || [];
    if (!roles.includes('admin')) throw new Error('Forbidden');

    await renameBlock(data.blockId, data.newName);

    return { success: true };
});
