import { query } from '$app/server';
import { listBlocks } from '$lib/server/cms/operations';

export const listBlocksFunction = query(async () => {
    return listBlocks();
});
