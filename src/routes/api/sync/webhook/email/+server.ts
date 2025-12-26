import { syncService } from '$lib/server/sync/service';
import type { RequestEvent } from '@sveltejs/kit';

/**
 * Brevo email webhook handler
 * Processes email events like delivered, opened, clicked, bounced, etc.
 * https://developers.brevo.com/reference/webhooks
 */
export async function POST(event: RequestEvent) {
	try {
		const payload = await event.request.json();

		// Process webhook through sync service
		await syncService.handleWebhook('email', payload);

		return new Response('OK', { status: 200 });
	} catch (error: any) {
		console.error('[BrevoWebhook][POST] Error processing webhook:', error);
		return new Response('Internal server error', { status: 500 });
	}
}