import { command } from '$app/server';
import { deleteBlockSchema } from '$lib/validations/cms';
import { deleteBlock } from '$lib/server/cms/operations';
import { getAuthenticatedUser } from '$lib/authorization';

export const deleteBlockFunction = command(deleteBlockSchema, async (data) => {
    const user = getAuthenticatedUser();
    const roles = user.roles as string[] || [];
    if (!roles.includes('admin')) throw new Error('Forbidden');

    await deleteBlock(data.blockId);

    return { success: true };
});
