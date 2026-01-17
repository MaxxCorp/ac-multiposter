import { Client } from '@upstash/qstash';
import { env } from '$env/dynamic/private';

// Initialize QStash client
// Make sure QSTASH_URL and QSTASH_TOKEN are set in .env
export const qstash = new Client({
    token: env.QSTASH_TOKEN || '',
    baseUrl: env.QSTASH_URL || 'https://qstash.upstash.io'
});

/**
 * Publish a JSON message to a destination URL via QStash
 */
export async function publishJSON(destinationUrl: string, body: any, headers?: Record<string, string>) {
    try {
        const result = await qstash.publishJSON({
            url: destinationUrl,
            body,
            headers
        });
        return { success: true, messageId: result.messageId };
    } catch (error: any) {
        console.error('Failed to publish to QStash:', error);
        return { success: false, error: error.message };
    }
}
