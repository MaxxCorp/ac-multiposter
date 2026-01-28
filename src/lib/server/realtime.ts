// import Ably from 'ably'; // Removed for dynamic import
import { env } from '$env/dynamic/private';

// Lazy initialization to avoid connecting if not configured or during build
let restClient: any = null; // using any to avoid type issues with dynamic import

async function getClient() {
    if (!restClient && env.ABLY_API_KEY) {
        try {
            // @ts-ignore
            const Ably = (await import('ably')).default;
            restClient = new Ably.Rest(env.ABLY_API_KEY);
        } catch (e) {
            console.error('Failed to load Ably module', e);
        }
    }
    return restClient;
}

export const CHANNELS = {
    EVENT_CHANGES: 'event-changes',
    ANNOUNCEMENT_CHANGES: 'announcement-changes'
} as const;

export type EventChangeType = 'create' | 'update' | 'delete';

export interface EventChangeMessage {
    type: EventChangeType;
    ids: string[];
    timestamp: number;
}

/**
 * Publish an event change notification
 */
export async function publishEventChange(type: EventChangeType, ids: string[]) {
    const client = await getClient();
    if (!client) {
        if (!env.ABLY_API_KEY) console.warn('ABLY_API_KEY not set, realtime features disabled');
        return;
    }

    const message: EventChangeMessage = {
        type,
        ids,
        timestamp: Date.now()
    };

    try {
        await client.channels.get(CHANNELS.EVENT_CHANGES).publish('change', message);
    } catch (error) {
        console.error('Failed to publish event change to Ably:', error);
    }
}

/**
 * Publish an announcement change notification
 */
export async function publishAnnouncementChange(type: EventChangeType, ids: string[]) {
    const client = await getClient();
    if (!client) {
        if (!env.ABLY_API_KEY) console.warn('ABLY_API_KEY not set, realtime features disabled');
        return;
    }

    const message: EventChangeMessage = {
        type,
        ids,
        timestamp: Date.now()
    };

    try {
        await client.channels.get(CHANNELS.ANNOUNCEMENT_CHANGES).publish('change', message);
    } catch (error) {
        console.error('Failed to publish announcement change to Ably:', error);
    }
}
