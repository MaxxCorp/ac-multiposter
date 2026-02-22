<script lang="ts">
	import "../app.css";
	import favicon from "$lib/assets/favicon.svg";
	import AuthHeader from "$lib/components/AuthHeader.svelte";
	import AppSidebar from "$lib/components/app-sidebar.svelte";
	import { Toaster } from "$lib/components/ui/sonner/index.js";
	import * as Sidebar from "$lib/components/ui/sidebar/index.js";
	import * as Breadcrumb from "$lib/components/ui/breadcrumb/index.js";
	import { onMount, tick } from "svelte";
	import { browser } from "$app/environment";
	import { kioskState } from "$lib/stores/kiosk.svelte";
	import { slide } from "svelte/transition";
	import { page } from "$app/stores";
	import { breadcrumbState } from "$lib/stores/breadcrumb.svelte";
	import { FEATURES } from "$lib/features";

	let { children } = $props();

	onMount(() => {
		if (browser && "serviceWorker" in navigator) {
			navigator.serviceWorker.getRegistrations().then((registrations) => {
				for (const registration of registrations) {
					registration.unregister();
				}
			});
		}
	});

	let isAuthPage = $derived(
		$page.url.pathname === "/login" || $page.url.pathname === "/signup",
	);
	let isKioskPage = $derived(
		$page.url.pathname.startsWith("/kiosks/") || kioskState.isKiosk,
	);

	const featureMeta = $derived.by(() =>
		breadcrumbState.feature
			? FEATURES.find((f) => f.key === breadcrumbState.feature)
			: null,
	);
	const breadcrumbSegments = $derived.by(
		() =>
			breadcrumbState.segments ??
			(featureMeta
				? [{ label: featureMeta.title, href: featureMeta.href }]
				: []),
	);
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

{#if isAuthPage}
	<main class="min-h-screen bg-background">
		{@render children()}
	</main>
{:else if isKioskPage}
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
{:else}
	<Sidebar.Provider>
		<AppSidebar />
		<Sidebar.Inset>
			<header class="flex h-14 shrink-0 items-center gap-2 border-b px-4">
				<Sidebar.Trigger class="-ml-1" />

				{#if breadcrumbSegments.length > 0 || breadcrumbState.current}
					<div class="ml-2">
						<Breadcrumb.Root>
							<Breadcrumb.List>
								<Breadcrumb.Item>
									<Breadcrumb.Link href="/"
										>Home</Breadcrumb.Link
									>
								</Breadcrumb.Item>

								{#each breadcrumbSegments as segment, i}
									<Breadcrumb.Separator />
									<Breadcrumb.Item>
										{#if segment.href && (i < breadcrumbSegments.length - 1 || breadcrumbState.current)}
											<Breadcrumb.Link href={segment.href}
												>{segment.label}</Breadcrumb.Link
											>
										{:else}
											<Breadcrumb.Page
												>{segment.label}</Breadcrumb.Page
											>
										{/if}
									</Breadcrumb.Item>
								{/each}

								{#if breadcrumbState.current}
									<Breadcrumb.Separator />
									<Breadcrumb.Item>
										<Breadcrumb.Page
											class="truncate max-w-xs"
											>{breadcrumbState.current}</Breadcrumb.Page
										>
									</Breadcrumb.Item>
								{/if}
							</Breadcrumb.List>
						</Breadcrumb.Root>
					</div>
				{/if}
			</header>
			<div class="flex flex-1 flex-col gap-4 p-4 md:p-8 bg-gray-50">
				<div class="mx-auto w-full max-w-7xl">
					{@render children()}
				</div>
			</div>
		</Sidebar.Inset>
	</Sidebar.Provider>
{/if}

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
