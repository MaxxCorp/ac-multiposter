import Ably from 'ably';
import { env } from '$env/dynamic/private';

// Lazy initialization to avoid connecting if not configured or during build
let restClient: Ably.Rest | null = null;

function getClient() {
    if (!restClient && env.ABLY_API_KEY) {
        restClient = new Ably.Rest(env.ABLY_API_KEY);
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
    const client = getClient();
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
    const client = getClient();
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
