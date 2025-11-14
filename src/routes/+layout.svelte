<script lang="ts">
	import '../app.css';
	import favicon from '$lib/assets/favicon.svg';
	import AuthHeader from '$lib/components/AuthHeader.svelte';
	import Toast from '$lib/components/ui/Toast.svelte';

	let { children, data } = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<AuthHeader initialUser={data?.user ?? null} />

<main class="min-h-screen bg-gray-50">
	<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
		{@render children()}
	</div>
</main>

<Toast />


<style>
	:global(body) {
		margin: 0;
		padding: 0;
		font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
	}

	:global(html) {
		scroll-behavior: smooth;
	}
</style>
