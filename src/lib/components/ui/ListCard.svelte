<script lang="ts">
	import { goto } from '$app/navigation';
	import type { Snippet } from 'svelte';

	interface Props {
		id: string;
		href: string;
		selected?: boolean;
		onToggle?: (id: string) => void;
		title: string | Snippet;
		subtitle?: string | Snippet;
		content?: Snippet;
		metadata?: Snippet;
		actions?: Snippet;
		badge?: Snippet;
		// Standard action handlers
		editHref?: string;
		onDelete?: (id: string) => Promise<void>;
		deleteLabel?: string;
		highlight?: boolean;
		cardNavigationEnabled?: boolean;
	}

	let {
		id,
		href,
		selected = false,
		onToggle,
		title,
		subtitle,
		content,
		metadata,
		actions,
		badge,
		editHref,
		onDelete,
		deleteLabel = 'Delete',
		highlight = false,
		cardNavigationEnabled = true
	}: Props = $props();

	const isCardNavigable = cardNavigationEnabled && Boolean(href);
	const navigationLabel = isCardNavigable
		? typeof title === 'string'
			? `Open details for ${title}`
			: 'Open details'
		: undefined;
	
	let deleting = $state(false);
	
	async function handleDelete(e: MouseEvent) {
		e.stopPropagation();
		if (!onDelete) return;
		
		if (!confirm(`${deleteLabel} this item?`)) return;
		
		deleting = true;
		try {
			await onDelete(id);
		} catch (error) {
			alert(`Failed to ${deleteLabel.toLowerCase()}`);
			deleting = false;
		}
	}
	function handleCardClick(event?: MouseEvent) {
		if (!isCardNavigable || !href) return;

		if (event?.defaultPrevented) return;

		const target = event?.target;
		if (target instanceof HTMLElement) {
			const interactive = target.closest('button, a, input, textarea, select, label, [role="button"], [role="link"]');
			if (interactive && interactive !== event?.currentTarget) {
				return;
			}
		}

		goto(href);
	}
</script>

<!-- svelte-ignore a11y_no_noninteractive_tabindex: composite card must remain focusable despite nested interactive regions -->
<div
	class={`relative bg-white shadow rounded-lg p-6 flex items-start gap-4 ${isCardNavigable ? 'cursor-pointer hover:bg-gray-50' : ''} transition-shadow ${highlight ? 'ring-2 ring-blue-400 ring-offset-2' : ''}`}
	onclick={isCardNavigable ? handleCardClick : undefined}
	role={isCardNavigable ? 'link' : undefined}
	aria-label={navigationLabel}
	tabindex={isCardNavigable ? 0 : undefined}
	onkeydown={isCardNavigable
		? (e) => {
			if (e.key === 'Enter' || e.key === ' ') {
				e.preventDefault();
				handleCardClick();
			}
		}
		: undefined}
>
	{#if onToggle}
		<input
			type="checkbox"
			checked={selected}
			onchange={() => onToggle?.(id)}
			onclick={(e) => e.stopPropagation()}
			class="mt-1 w-4 h-4 text-blue-600"
		/>
	{/if}
	
	<div class="flex-1">
		<div class="flex items-start gap-3 mb-2">
			<div class="flex-1">
				<h2 class="text-xl font-semibold">
					{#if typeof title === 'string'}
						{title}
					{:else}
						{@render title()}
					{/if}
				</h2>
				{#if subtitle}
					<div class="text-sm text-gray-600 mt-1">
						{#if typeof subtitle === 'string'}
							{subtitle}
						{:else}
							{@render subtitle()}
						{/if}
					</div>
				{/if}
			</div>
			{#if badge}
				<div class="shrink-0">
					{@render badge()}
				</div>
			{/if}
		</div>
		
		{#if content}
			<div class="mt-2">
				{@render content()}
			</div>
		{/if}
		
		{#if metadata}
			<div class="mt-3">
				{@render metadata()}
			</div>
		{/if}
	</div>
	
	{#if actions}
		<div class="flex flex-col gap-2 shrink-0">
			{@render actions()}
		</div>
	{:else if editHref || onDelete}
		<div class="flex flex-col gap-2 shrink-0">
			{#if editHref}
				<a
					href={editHref}
					data-sveltekit-preload-code="hover"
					class="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 text-center"
					onclick={(e) => e.stopPropagation()}
				>
					Edit
				</a>
			{/if}
			{#if onDelete}
				<button
					onclick={handleDelete}
					disabled={deleting}
					class="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
				>
					{deleting ? 'Deleting...' : deleteLabel}
				</button>
			{/if}
		</div>
	{/if}
</div>
