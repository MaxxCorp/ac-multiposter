import { LocalBlobStorageProvider } from './local';
import { VercelBlobStorageProvider } from './vercel';
import type { BlobStorageProvider } from './types';
import { env } from '$env/dynamic/private';

let provider: BlobStorageProvider;

/**
 * Get the appropriate blob storage provider based on the environment
 */
export function getStorageProvider(): BlobStorageProvider {
    if (provider) return provider;

    // Use Vercel provider if VERCEL env is set, or if BLOB_READ_WRITE_TOKEN is present
    // Fallback to local for non-vercel environments unless explicitly forced
    const isVercel = env.VERCEL === '1' || !!env.BLOB_READ_WRITE_TOKEN;

    if (isVercel) {

        provider = new VercelBlobStorageProvider();
    } else {

        provider = new LocalBlobStorageProvider();
    }

    return provider;
}
