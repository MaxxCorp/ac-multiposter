import { globalEvents, type EventPayload } from '$lib/server/events';
import type { RequestEvent } from '@sveltejs/kit';

export const GET = async (event: RequestEvent) => {
    const session = event.locals.session;
    const user = event.locals.user;

    if (!session || !user) {
        return new Response('Unauthorized', { status: 401 });
    }

    const userId = user.id;

    const stream = new ReadableStream({
        start(controller) {
            const encoder = new TextEncoder();

            const send = (event: string, data: any) => {
                controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
            };

            const onEventCreated = (payload: EventPayload) => {
                if (payload.userId === userId) {
                    send('event-created', payload);
                }
            };

            const onEventUpdated = (payload: EventPayload) => {
                if (payload.userId === userId) {
                    send('event-updated', payload);
                }
            };

            const onEventDeleted = (payload: EventPayload) => {
                if (payload.userId === userId) {
                    send('event-deleted', payload);
                }
            };

            globalEvents.on('event-created', onEventCreated);
            globalEvents.on('event-updated', onEventUpdated);
            globalEvents.on('event-deleted', onEventDeleted);

            // Keep connection alive
            const interval = setInterval(() => {
                controller.enqueue(encoder.encode(': keep-alive\n\n'));
            }, 30000);

            return () => {
                clearInterval(interval);
                globalEvents.off('event-created', onEventCreated);
                globalEvents.off('event-updated', onEventUpdated);
                globalEvents.off('event-deleted', onEventDeleted);
            };
        },
        cancel() {
            // Cleanup handled in start return
        }
    });

    return new Response(stream, {
        headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive'
        }
    });
};
