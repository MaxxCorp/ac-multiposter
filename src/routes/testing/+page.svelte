<script lang="ts">
	import { getLastSubmissionData } from './get-last-submission.remote';
	import { onMount } from 'svelte';

	let lastSubmissionData: any = null;

	onMount(async () => {
		try {
			lastSubmissionData = await getLastSubmissionData();
		} catch (error) {
			console.error('Failed to load last submission:', error);
		}
	});
</script>

<div class="container mx-auto px-4 py-8">
	<div class="max-w-4xl mx-auto">
		<h1 class="text-3xl font-bold mb-6">Berlin.de Sync Testing</h1>

		<div class="bg-white shadow rounded-lg p-6">
			<h2 class="text-xl font-semibold mb-4">Last Submission Data</h2>

			{#if lastSubmissionData}
				<div class="space-y-4">
					<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
						<div>
							<strong>Submitted At:</strong>
							<p class="text-gray-600">{new Date(lastSubmissionData.timestamp).toLocaleString()}</p>
						</div>
						<div>
							<strong>Event ID:</strong>
							<p class="text-gray-600">{lastSubmissionData.eventId}</p>
						</div>
					</div>

					<div>
						<strong>Form Data:</strong>
						<pre class="bg-gray-100 p-4 rounded mt-2 overflow-x-auto text-sm">{lastSubmissionData.formData ? JSON.stringify(lastSubmissionData.formData, null, 2) : 'No data'}</pre>
					</div>

					{#if lastSubmissionData.response}
						<div>
							<strong>Response:</strong>
							<pre class="bg-gray-100 p-4 rounded mt-2 overflow-x-auto text-sm">{lastSubmissionData.response ? JSON.stringify(lastSubmissionData.response, null, 2) : 'No response'}</pre>
						</div>
					{/if}
				</div>
			{:else}
				<p class="text-gray-500">No submissions yet. Create a Berlin.de sync and push an event to see data here.</p>
			{/if}
		</div>
	</div>
</div>