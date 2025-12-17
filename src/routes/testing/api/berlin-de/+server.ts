import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { setLastSubmission } from '$lib/stores/submission.store';

export const POST: RequestHandler = async ({ request, url }) => {
	try {
		// Parse the form data
		const formData = await request.formData();
		const data: Record<string, string> = {};

		for (const [key, value] of formData.entries()) {
			data[key] = value.toString();
		}

		// Extract event ID from the data (we'll add it to the form data)
		const eventId = data.eventId || 'unknown';

		// Store the submission
		const submission = {
			timestamp: Date.now(),
			eventId,
			formData: data,
			response: {
				status: 'success',
				message: 'Data received successfully',
				url: url.toString()
			}
		};

		// Update the store (this will work in development with a single server instance)
		setLastSubmission(submission);

		console.log('[Berlin.de Test Endpoint] Received submission:', {
			eventId,
			fieldCount: Object.keys(data).length,
			fields: Object.keys(data)
		});

		// Return success response
		return json({
			success: true,
			message: 'Event data received successfully',
			eventId,
			receivedAt: new Date().toISOString()
		});

	} catch (error) {
		console.error('[Berlin.de Test Endpoint] Error:', error);

		const errorSubmission = {
			timestamp: Date.now(),
			eventId: 'error',
			formData: null,
			response: {
				status: 'error',
				message: error instanceof Error ? error.message : 'Unknown error',
				url: url.toString()
			}
		};

		setLastSubmission(errorSubmission);

		return json({
			success: false,
			message: 'Failed to process submission',
			error: error instanceof Error ? error.message : 'Unknown error'
		}, { status: 500 });
	}
};