<script lang="ts">
	import "../app.css";
	import favicon from "$lib/assets/favicon.svg";
	import AuthHeader from "$lib/components/AuthHeader.svelte";
	import { Toaster } from "$lib/components/ui/sonner/index.js";
	import { onMount } from "svelte";
	import { browser } from "$app/environment";
	import { kioskState } from "$lib/stores/kiosk.svelte";
	import { slide } from "svelte/transition";
	import { invalidate } from "$app/navigation";
	import { toast } from "svelte-sonner";

	let { children } = $props();

	onMount(() => {
		if (browser && "serviceWorker" in navigator) {
			navigator.serviceWorker.getRegistrations().then((registrations) => {
				for (const registration of registrations) {
					registration.unregister();
				}
			});
		}

		if (browser) {
			// Use native EventSource for SSE
			const eventSource = new EventSource("/api/events/stream");

			eventSource.onmessage = (event) => {
				console.log("Event update received:", event.data);
				invalidate("app:events");
				toast.info("Events updated", {
					description: "Refreshing data...",
				});
			};

			eventSource.onerror = (error) => {
				console.error("SSE connection error:", error);
			};

			return () => {
				eventSource.close();
			};
		}
	});
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

{#if !kioskState.isKiosk || kioskState.isHeaderVisible}
	<div transition:slide class="relative z-50">
		<AuthHeader />
	</div>
{/if}

<main class="min-h-screen bg-gray-50">
	<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
		{@render children()}
	</div>
</main>

<Toaster richColors position="top-right" />

<style>
	:global(body) {
		margin: 0;
		padding: 0;
		font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,
			"Helvetica Neue", Arial, sans-serif;
	}

	:global(html) {
		scroll-behavior: smooth;
	}
</style>
