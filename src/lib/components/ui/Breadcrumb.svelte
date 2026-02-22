<script lang="ts">
	import { breadcrumbState } from "$lib/stores/breadcrumb.svelte";
	import type { Feature } from "$lib/authorization";

	interface Props {
		feature?: Feature;
		current?: string;
		segments?: Array<{ label: string; href?: string }>;
	}

	let { feature, current, segments }: Props = $props();

	// When this component mounts or its props change, update the store.
	$effect(() => {
		breadcrumbState.set({
			feature,
			current,
			segments,
		});

		// Optional: Clear breadcrumbs when this component unmounts.
		// Typically, the next page sets its own breadcrumbs, but clearing it ensures no stale data.
		return () => {
			breadcrumbState.set({});
		};
	});
</script>

<!-- This component intentionally renders nothing. It acts as a bridge to send route metadata up to the Layout frame. -->
