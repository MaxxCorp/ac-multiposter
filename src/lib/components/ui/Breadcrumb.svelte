<script lang="ts">
	import { goto } from '$app/navigation';
	import type { Feature } from '$lib/authorization';
	import { FEATURES } from '$lib/features';

	interface Props {
		feature?: Feature;
		current?: string;
		segments?: Array<{ label: string; href?: string }>;
	}

	let { feature, current, segments }: Props = $props();

	// Derive segments reactively in Svelte 5
	const featureMeta = $derived.by(() => (feature ? FEATURES.find((f) => f.key === feature) : null));
	const breadcrumbSegments = $derived.by(() => segments ?? (featureMeta ? [{ label: featureMeta.title, href: featureMeta.href }] : []));
</script>

<nav class="mb-4 text-sm" aria-label="Breadcrumb">
	<ol class="flex items-center space-x-2 text-gray-600">
		<li>
			<button 
				type="button" 
				onclick={() => goto('/', { invalidateAll: true })} 
				class="hover:text-blue-600 hover:underline"
			>
				Home
			</button>
		</li>
		{#each breadcrumbSegments as segment, i}
			<li>
				<span class="text-gray-400">/</span>
			</li>
			<li>
				{#if segment.href && (i < breadcrumbSegments.length - 1 || current)}
					<button 
						type="button" 
						onclick={() => goto(segment.href!, { invalidateAll: true })} 
						class="hover:text-blue-600 hover:underline"
					>
						{segment.label}
					</button>
				{:else}
					<span class="text-gray-900 font-medium">{segment.label}</span>
				{/if}
			</li>
		{/each}
		{#if current}
			<li>
				<span class="text-gray-400">/</span>
			</li>
			<li class="text-gray-900 font-medium truncate max-w-xs">{current}</li>
		{/if}
	</ol>
</nav>
