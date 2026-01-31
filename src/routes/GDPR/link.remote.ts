import { command } from '$app/server';
import { linkBlockSchema } from '$lib/validations/cms';
import { linkBlock, getBlock } from '$lib/server/cms/operations';
import { getAuthenticatedUser } from '$lib/authorization';
import { error } from '@sveltejs/kit';

export const linkBlockFunction = command(linkBlockSchema, async (data) => {
    const user = getAuthenticatedUser();
    const roles = user.roles as string[] || [];
    if (!roles.includes('admin')) throw new Error('Forbidden');

    const block = await getBlock(data.blockId);
    if (!block) error(404, 'Block not found');

    await linkBlock('gdpr', 'main', data.blockId);

    return { success: true };
});
