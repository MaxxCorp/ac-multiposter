
import Redis from 'ioredis';
import { env } from '$env/dynamic/private';

/**
 * SSE Manager with Redis Pub/Sub support for Serverless Scaling
 */
export class SSEManager {
    private static instance: SSEManager;
    private clients: Set<ReadableStreamDefaultController>;
    private publisher: Redis | null = null;
    private subscriber: Redis | null = null;
    private isRedisEnabled: boolean = false;

    private constructor() {
        this.clients = new Set();
        this.initRedis();
    }

    public static getInstance(): SSEManager {
        if (!SSEManager.instance) {
            SSEManager.instance = new SSEManager();
        }
        return SSEManager.instance;
    }

    private initRedis() {
        // Check for Upstash Redis URL (usually begins with redis:// or rediss:// for ioredis)
        // Note: UPSTASH_REDIS_REST_URL is for HTTP. For ioredis we need a TCP connection string.
        // Users often put the `redis://...` string in QSTASH_URL or a specific REDIS_URL.
        // Since the user is using Upstash, they likely have a TCP connection string too.
        // We will try extracting from UPSTASH_REDIS_REST_URL if possible, or fallback to REDIS_URL.

        // Actually, Upstash REST URL is `https://...`. `ioredis` needs `rediss://...`.
        // We really need a standard connection string variable. 
        // I'll check for REDIS_URL or KV_URL.

        const connectionString = env.REDIS_URL || env.KV_URL; // Common names

        if (connectionString) {
            try {
                console.log('[SSE] Initializing Redis connection...');
                this.publisher = new Redis(connectionString);
                this.subscriber = new Redis(connectionString);

                this.subscriber.subscribe('events', (err, count) => {
                    if (err) {
                        console.error('[SSE] Failed to subscribe: %s', err.message);
                    } else {
                        console.log(`[SSE] Subscribed to 'events' channel. Count: ${count}`);
                        this.isRedisEnabled = true;
                    }
                });

                this.subscriber.on('message', (channel, message) => {
                    if (channel === 'events') {
                        this.broadcastLocal(message);
                    }
                });

                this.publisher.on('error', (err) => console.error('[SSE] Redis Publisher Error', err));
                this.subscriber.on('error', (err) => console.error('[SSE] Redis Subscriber Error', err));

            } catch (error) {
                console.error('[SSE] Failed to initialize Redis:', error);
                this.isRedisEnabled = false;
            }
        } else {
            console.warn('[SSE] No REDIS_URL found. Running in single-instance mode (memory only).');
        }
    }

    /**
     * Subscribe a new client to the stream
     */
    subscribe(controller: ReadableStreamDefaultController) {
        this.clients.add(controller);
        console.log(`[SSE] Client connected. Total local clients: ${this.clients.size}`);
    }

    /**
     * Unscubscribe a client
     */
    unsubscribe(controller: ReadableStreamDefaultController) {
        this.clients.delete(controller);
        console.log(`[SSE] Client disconnected. Total local clients: ${this.clients.size}`);
    }

    /**
     * Broadcast a message to all connected clients (globally via Redis)
     */
    async broadcast(message: any) {
        const msgString = JSON.stringify(message);

        if (this.isRedisEnabled && this.publisher) {
            try {
                await this.publisher.publish('events', msgString);
            } catch (e) {
                console.error('[SSE] Failed to publish to Redis, falling back to local broadcast', e);
                this.broadcastLocal(msgString);
            }
        } else {
            this.broadcastLocal(msgString);
        }
    }

    /**
     * Internal method to write to local streams
     */
    private broadcastLocal(messageString: string) {
        const data = `data: ${messageString}\n\n`;
        const encoder = new TextEncoder();
        const uint8 = encoder.encode(data);

        this.clients.forEach(controller => {
            try {
                controller.enqueue(uint8);
            } catch (error) {
                this.unsubscribe(controller);
            }
        });
    }
}

export const sse = SSEManager.getInstance();
