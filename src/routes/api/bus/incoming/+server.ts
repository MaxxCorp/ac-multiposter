
import { Receiver } from '@upstash/qstash';
import { sse } from '$lib/server/sse';
import { env } from '$env/dynamic/private';
import type { RequestEvent } from './$types';

const receiver = new Receiver({
    currentSigningKey: env.QSTASH_CURRENT_SIGNING_KEY || '',
    nextSigningKey: env.QSTASH_NEXT_SIGNING_KEY || '',
});

export async function POST(event: RequestEvent) {
    const signature = event.request.headers.get('upstash-signature');
    const bodyText = await event.request.text();

    console.log('[Bus/Incoming] Received incoming message');

    try {
        // Verify signature
        // Note: In development without a tunnel, QStash can't reach us, so we might test by manually POSTing
        // and skipping verification if keys are dummy values or using a bypass flag.
        // For production/standard compliance, we always verify if keys are present.
        if (env.QSTASH_CURRENT_SIGNING_KEY) {
            const isValid = await receiver.verify({
                signature: signature || '',
                body: bodyText,
            });

            if (!isValid) {
                console.error('[Bus/Incoming] Invalid signature');
                return new Response('Invalid signature', { status: 401 });
            }
        } else {
            console.warn('[Bus/Incoming] Skipping signature verification (QSTASH keys not set?)');
        }

        const payload = JSON.parse(bodyText);
        console.log('[Bus/Incoming] payload:', payload);

        // Broadcast to all connected clients
        sse.broadcast(payload);

        return new Response('OK', { status: 200 });

    } catch (error) {
        console.error('[Bus/Incoming] Error processing message', error);
        return new Response('Internal formatting error', { status: 400 });
    }
}
