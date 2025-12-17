import { command } from '$app/server';
import { getLastSubmission } from '$lib/stores/submission.store';

export const getLastSubmissionData = command(async () => {
	return getLastSubmission();
});