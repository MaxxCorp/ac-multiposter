import { query } from '$app/server';

export const testPing = query(async (msg?: string) => {
    return `Pong: ${msg}`;
});
