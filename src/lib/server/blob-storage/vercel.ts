import type { BlobStorageProvider } from './types';
import { put, del } from '@vercel/blob';

export class VercelBlobStorageProvider implements BlobStorageProvider {
    async put(path: string, content: Buffer | string, contentType: string): Promise<string> {
        // Vercel Blob requires BLOB_READ_WRITE_TOKEN in env
        const response = await put(path, content, {
            contentType,
            access: 'public',
            addRandomSuffix: false,
            allowOverwrite: true,
        });
        return response.url;
    }

    async delete(url: string): Promise<void> {
        await del(url);
    }
}
