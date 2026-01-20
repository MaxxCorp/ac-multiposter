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
	import * as Ably from "ably";

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
			// Ably Realtime connection
			let realtime: Ably.Realtime;
			try {
				realtime = new Ably.Realtime({ authUrl: "/api/ably/auth" });

				const eventsChannel = realtime.channels.get("event-changes");
				eventsChannel.subscribe("change", (message) => {
					console.log("Event update received:", message.data);
					invalidate("app:events");
					toast.info("Events updated", {
						description: "Refreshing data...",
					});
				});

				const announcementsChannel = realtime.channels.get(
					"announcement-changes",
				);
				announcementsChannel.subscribe("change", (message) => {
					console.log("Announcement update received:", message.data);
					invalidate("app:announcements");
					toast.info("Announcements updated", {
						description: "Refreshing data...",
					});
				});
			} catch (e) {
				console.error("Failed to connect to Ably:", e);
			}

			return () => {
				if (realtime) {
					realtime.close();
				}
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
