
import { sse } from '$lib/server/sse';


export async function GET({ request }: { request: Request }) {
    const stream = new ReadableStream({
        start(controller) {
            sse.subscribe(controller);

            // Send initial ping to establish connection
            const data = `data: ${JSON.stringify({ type: 'PING' })}\n\n`;
            controller.enqueue(new TextEncoder().encode(data));
        },
        cancel(controller) {
            sse.unsubscribe(controller);
        }
    });

    return new Response(stream, {
        headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive'
        }
    });
}
