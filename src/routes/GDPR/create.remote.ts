import { command } from '$app/server';
import { createBlockSchema } from '$lib/validations/cms';
import { createBlock, linkBlock } from '$lib/server/cms/operations';
import { getAuthenticatedUser } from '$lib/authorization';

export const createBlockFunction = command(createBlockSchema, async (data) => {
    const user = getAuthenticatedUser();
    const roles = user.roles as string[] || [];
    if (!roles.includes('admin')) throw new Error('Forbidden');

    const block = await createBlock(data.name, data.description);
    await linkBlock('gdpr', 'main', block.id);

    return { success: true, block };
});
