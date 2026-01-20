import Ably from 'ably';
import { env } from '$env/dynamic/private';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async () => {
    if (!env.ABLY_API_KEY) {
        return json({ error: 'Missing ABLY_API_KEY' }, { status: 500 });
    }

    const client = new Ably.Rest(env.ABLY_API_KEY);
    try {
        const tokenRequestData = await client.auth.createTokenRequest({
            clientId: 'browser-client'
        });
        return json(tokenRequestData);
    } catch (err) {
        console.error('Error creating Ably token request:', err);
        return json({ error: 'Internal Server Error' }, { status: 500 });
    }
};
