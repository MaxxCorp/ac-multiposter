// Server-side storage for testing submissions
// This is not a Svelte store since it's used server-side
export interface LastSubmission {
	timestamp: number;
	eventId: string;
	formData: Record<string, string> | null;
	response: any;
}

let lastSubmission: LastSubmission | null = null;

export function setLastSubmission(data: LastSubmission) {
	lastSubmission = data;
}

export function getLastSubmission() {
	return lastSubmission;
}