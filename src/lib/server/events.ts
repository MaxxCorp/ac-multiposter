import { EventEmitter } from 'events';

/**
 * Global event emitter for server-side events.
 * Note: This works for single-instance deployments.
 * For multi-instance, use Redis Pub/Sub or similar.
 */
export const globalEvents = new EventEmitter();

export type EventType = 'event-created' | 'event-updated' | 'event-deleted';

export interface EventPayload {
    userId: string;
    eventId: string;
    source: 'sync' | 'user';
}
