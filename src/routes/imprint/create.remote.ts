import { command } from '$app/server';
import { createBlockSchema } from '$lib/validations/cms';
import { createBlock, linkBlock } from '$lib/server/cms/operations';
import { getAuthenticatedUser } from '$lib/authorization';

export const createBlockFunction = command(createBlockSchema, async (data) => {
    const user = getAuthenticatedUser();
    const roles = user.roles as string[] || [];
    if (!roles.includes('admin')) throw new Error('Forbidden');

    const block = await createBlock(data.name, data.description);

    // Auto-link to imprint main slot if created here?
    // User said: "allow link to be called... create should then call link".
    // So we link it immediately.
    await linkBlock('imprint', 'main', block.id);

    return { success: true, block };
});
