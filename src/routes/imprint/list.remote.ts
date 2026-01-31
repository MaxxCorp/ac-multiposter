import { query } from '$app/server';
import { listBlocks } from '$lib/server/cms/operations';

export const listBlocksFunction = query(async () => {
    // Only admins usually list blocks, but keeping it open for read if needed isn't terrible.
    // Ideally restricted, but `read` is open.
    // List implies admin intent usually.
    return listBlocks();
});
