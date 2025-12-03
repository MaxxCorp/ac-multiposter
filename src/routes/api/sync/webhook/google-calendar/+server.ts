import { syncService } from '$lib/server/sync/service';
import type { RequestEvent } from '@sveltejs/kit';

/**
 * Google Calendar push notification webhook handler
 * https://developers.google.com/calendar/api/guides/push
 */
export async function POST(event: RequestEvent) {
	const channelId = event.request.headers.get('X-Goog-Channel-ID');
	const resourceId = event.request.headers.get('X-Goog-Resource-ID');
	const resourceState = event.request.headers.get('X-Goog-Resource-State');
	const channelToken = event.request.headers.get('X-Goog-Channel-Token');

	// Verify the channel token matches a known sync config ID
	// (We set the token to the config ID in the provider)
	if (!channelToken) {
		return new Response('Missing channel token', { status: 400 });
	}

	// Handle sync event (ignore 'sync' state which is initial verification)
	if (resourceState === 'exists' || resourceState === 'not_exists') {
		try {
			// Trigger sync for the associated config
			await syncService.handleWebhook('google-calendar', {
				channelId,
				resourceId,
				resourceState,
				channelToken
			});

			return new Response('Webhook processed', { status: 200 });
		} catch (error: any) {
			console.error('Failed to handle Google Calendar webhook:', error);
			return new Response('Internal server error', { status: 500 });
		}
	}

	// For 'sync' state, just acknowledge
	return new Response('OK', { status: 200 });
}
