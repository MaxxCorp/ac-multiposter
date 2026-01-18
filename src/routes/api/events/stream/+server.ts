import { redisSubscriber, CHANNELS } from '$lib/server/redis';
import type { RequestHandler } from '@sveltejs/kit';

export const GET: RequestHandler = async ({ request }) => {
    // Check if Redis is available
    if (!redisSubscriber) {
        return new Response('Redis not configured', { status: 503 });
    }

    // Capture the subscriber reference after null check for TypeScript narrowing
    const subscriber = redisSubscriber;

    const stream = new ReadableStream({
        start(controller) {
            const encoder = new TextEncoder();
            let isClosed = false;

            // Send initial connection message
            controller.enqueue(encoder.encode(': connected\n\n'));

            const onMessage = (channel: string, message: string) => {
                if (isClosed) return;
                if (channel === CHANNELS.EVENT_CHANGES) {
                    // SSE format: data: <message>\n\n
                    const sseMessage = `data: ${message}\n\n`;
                    try {
                        controller.enqueue(encoder.encode(sseMessage));
                    } catch (e) {
                        // Stream is closed, mark as such
                        isClosed = true;
                    }
                }
            };

            // Subscribe to Redis channel
            subscriber.subscribe(CHANNELS.EVENT_CHANGES).then(() => {
                console.log('SSE client connected, subscribed to Redis channel');
                subscriber.on('message', onMessage);
            }).catch((err) => {
                console.error('Failed to subscribe to Redis:', err);
                controller.close();
            });

            // Cleanup when stream closes
            request.signal.addEventListener('abort', () => {
                console.log('SSE client disconnected');
                isClosed = true;
                subscriber.removeListener('message', onMessage);
            });
        }
    });

    return new Response(stream, {
        headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
        }
    });
};
