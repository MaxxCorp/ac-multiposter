import { globalEvents, type EventPayload } from '$lib/server/events';
import type { RequestEvent } from '@sveltejs/kit';

export const GET = async (event: RequestEvent) => {


    const session = event.locals.session;
    const user = event.locals.user;



    if (!session || !user) {
        console.log('[SSE] Returning 401 Unauthorized');
        return new Response('Unauthorized', { status: 401 });
    }

    const userId = user.id;
    console.log('[SSE] Starting stream for user:', userId);

    const stream = new ReadableStream({
        start(controller) {
            const encoder = new TextEncoder();
            let isClosed = false;

            const send = (event: string, data: any) => {
                if (!isClosed) {
                    try {
                        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
                    } catch (error) {
                        // Stream already closed, mark as closed to prevent further attempts
                        isClosed = true;
                    }
                }
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
                if (!isClosed) {
                    try {
                        controller.enqueue(encoder.encode(': keep-alive\n\n'));
                    } catch (error) {
                        // Stream closed, stop trying
                        isClosed = true;
                        clearInterval(interval);
                    }
                }
            }, 30000);

            return () => {
                isClosed = true;
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
