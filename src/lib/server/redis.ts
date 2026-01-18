import Redis from 'ioredis';
import { env } from '$env/dynamic/private';

// Create a Redis client instance
const createClient = () => {
    const url = env.REDIS_URL;
    if (!url) {
        console.warn('REDIS_URL not set, Redis features will be disabled');
        return null;
    }
    return new Redis(url);
};

// Global clients (singleton-like pattern for serverless/HMR context)
// One for publishing, one for subscribing (blocking)
export const redisPublisher = createClient();
export const redisSubscriber = createClient();

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
    if (!redisPublisher) return;

    const message: EventChangeMessage = {
        type,
        ids,
        timestamp: Date.now()
    };

    try {
        await redisPublisher.publish(CHANNELS.EVENT_CHANGES, JSON.stringify(message));
    } catch (error) {
        console.error('Failed to publish event change:', error);
    }
}

/**
 * Publish an announcement change notification
 */
export async function publishAnnouncementChange(type: EventChangeType, ids: string[]) {
    if (!redisPublisher) return;

    const message: EventChangeMessage = {
        type,
        ids,
        timestamp: Date.now()
    };

    try {
        await redisPublisher.publish(CHANNELS.ANNOUNCEMENT_CHANGES, JSON.stringify(message));
    } catch (error) {
        console.error('Failed to publish announcement change:', error);
    }
}
