<script lang="ts">
	import type { HTMLFormAttributes } from 'svelte/elements';
	import type { RemoteForm } from '@sveltejs/kit';
	import { toast } from '$lib/stores/toast.svelte';
	import { createCampaignSchema, updateCampaignSchema } from '$lib/validations/campaign';

	type Mode = 'create' | 'edit';

	interface Props extends Omit<HTMLFormAttributes, 'action' | 'method'> {
		form: RemoteForm<any, any>;
		mode?: Mode;
		submitLabel?: string;
		pendingLabel?: string;
		includeIdField?: boolean;
		cancelHref?: string;
		onCancel?: () => void;
		enhance?: Parameters<RemoteForm<any, any>['enhance']>[0];
	}

	let {
		form,
		enhance,
		mode = 'create',
		submitLabel = mode === 'create' ? 'Create Campaign' : 'Save Changes',
		pendingLabel = mode === 'create' ? 'Creating...' : 'Saving...',
		includeIdField = false,
		cancelHref,
		onCancel,
		class: className = '',
		...rest
	}: Props = $props();

	const showCancelLink = typeof cancelHref === 'string';
	const showCancelButton = !showCancelLink && typeof onCancel === 'function';

	let preflightedForm = $state<RemoteForm<any, any>>(form);
	let isSubmitting = $state(false);

	const nameIssues = () => preflightedForm.fields.name?.issues?.() ?? [];
	const contentIssues = () => preflightedForm.fields.content?.issues?.() ?? [];
	const allIssues = () => preflightedForm.fields.allIssues?.() ?? [...nameIssues(), ...contentIssues()];

	let lastIssueSignature = '';

	$effect(() => {
		const schema = mode === 'edit' ? updateCampaignSchema : createCampaignSchema;
		preflightedForm = form.preflight(schema);
	});

	function validateOnBlur() {
		preflightedForm.validate();
		maybeNotifyValidationIssues();
	}

	async function validateBeforeSubmit(includeUntouched = true) {
		await preflightedForm.validate({ includeUntouched });
		maybeNotifyValidationIssues();
		return allIssues().length === 0;
	}

	const handleFormEnhance: Parameters<RemoteForm<any, any>['enhance']>[0] = async (payload) => {
		const isValid = await validateBeforeSubmit(true);
		if (!isValid || isSubmitting) {
			return;
		}

		isSubmitting = true;

		const originalSubmit = payload.submit;
		let submissionPromise: ReturnType<typeof originalSubmit> | null = null;

		const guardedPayload = {
			...payload,
			submit: () => {
				if (!submissionPromise) {
					submissionPromise = originalSubmit();
				}
				return submissionPromise;
			},
		};

		const runDefaultSubmit = async () => {
			await guardedPayload.submit();
			if ((preflightedForm.fields.allIssues?.() ?? []).length === 0) {
				payload.form.reset();
			}
		};

		try {
			if (enhance) {
				await enhance(guardedPayload);
			} else {
				await runDefaultSubmit();
			}
		} finally {
			isSubmitting = false;
		}
	};

	const formAttributes = $derived(preflightedForm.enhance(handleFormEnhance));

	function maybeNotifyValidationIssues() {
		const issues = allIssues();

		if (issues.length === 0) {
			lastIssueSignature = '';
			return;
		}

		const signature = issues.map((issue) => issue.message).join('|');

		if (signature === lastIssueSignature) {
			return;
		}

		lastIssueSignature = signature;
		toast.error('Please fix the highlighted fields before continuing.');
	}
</script>

<form {...formAttributes} {...rest} class={className || 'space-y-6'}>
	{#if includeIdField}
		<input {...preflightedForm.fields.id.as('text')} class="hidden" />
	{/if}

	<label class="block text-sm font-medium text-gray-700 mb-2">
		<span>Campaign Name</span>
		<input
			{...preflightedForm.fields.name.as('text')}
			onblur={validateOnBlur}
			class={`mt-2 w-full px-4 py-2 border rounded-md focus:ring-2 transition-colors ${nameIssues().length
				? 'border-red-500 focus:ring-red-500 focus:border-red-500'
				: 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'}`}
			placeholder="Enter campaign name"
		/>
		{#each nameIssues() as issue}
			<p class="mt-1 text-sm text-red-600">{issue.message}</p>
		{/each}
	</label>

	<label class="block text-sm font-medium text-gray-700 mb-2">
		<span>Content (JSON)</span>
		<textarea
			{...preflightedForm.fields.content.as('text')}
			onblur={validateOnBlur}
			rows="12"
			class={`mt-2 w-full px-4 py-2 border rounded-md focus:ring-2 font-mono text-sm transition-colors ${contentIssues().length
				? 'border-red-500 focus:ring-red-500 focus:border-red-500'
				: 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'}`}
			placeholder="{'{}'}"
		></textarea>
		<p class="mt-1 text-sm text-gray-500">Enter campaign content as JSON</p>
		{#each contentIssues() as issue}
			<p class="mt-1 text-sm text-red-600">{issue.message}</p>
		{/each}
	</label>

	<div class="flex gap-3">
		<button
			type="submit"
			disabled={preflightedForm.pending > 0}
			class="px-6 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
		>
			{preflightedForm.pending > 0 ? pendingLabel : submitLabel}
		</button>

		{#if showCancelLink}
			<a
				href={cancelHref}
				class="px-6 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
			>
				Cancel
			</a>
		{:else if showCancelButton}
			<button
				type="button"
				onclick={onCancel}
				class="px-6 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600"
			>
				Cancel
			</button>
		{/if}
	</div>
</form>
