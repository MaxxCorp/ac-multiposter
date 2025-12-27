import { error } from '@sveltejs/kit';
import QRCode from 'qrcode';
import type { RequestHandler } from './$types';
import { env } from '$env/dynamic/private';

export const GET: RequestHandler = async ({ params, url }) => {
    const eventId = params.id;

    const baseUrl = env.PUBLIC_BASE_URL || url.origin;
    const eventUrl = `${baseUrl}/events/${eventId}`;

    try {
        const qrBuffer = await QRCode.toBuffer(eventUrl, {
            width: 300,
            margin: 2,
            color: {
                dark: '#1e40af', // blue-800
                light: '#ffffff'
            }
        });

        return new Response(new Uint8Array(qrBuffer), {
            headers: {
                'Content-Type': 'image/png',
                'Cache-Control': 'public, max-age=3600'
            }
        });
    } catch (err) {
        console.error('Failed to generate QR code:', err);
        throw error(500, 'Failed to generate QR code');
    }
};
