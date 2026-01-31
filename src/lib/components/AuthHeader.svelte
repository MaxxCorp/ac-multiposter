<script lang="ts">
	import { authClient } from "$lib/auth-client";
	import { onMount } from "svelte";

	let user = $state<any>(null);
	let loading = $state(true);
	let isOpen = $state(false);
	let signingIn = $state(false);
	let showProviderMenu = $state(false);

	onMount(async () => {
		try {
			const session = await authClient.getSession();
			user = session?.data?.user;
		} catch (error) {
			console.error("Failed to load session:", error);
		} finally {
			loading = false;
		}
	});

	async function handleSignIn(provider: "google" | "microsoft") {
		try {
			signingIn = true;
			await authClient.signIn.social({
				provider,
				callbackURL: window.location.pathname,
			});
		} catch (error) {
			console.error("Sign in failed:", error);
			signingIn = false;
		}
	}

	async function handleSignOut() {
		try {
			await authClient.signOut({
				fetchOptions: {
					onSuccess: () => {
						user = null;
						isOpen = false;
						showProviderMenu = false;
						window.location.href = "/";
					},
				},
			});
		} catch (error) {
			console.error("Sign out failed:", error);
		}
	}

	function toggleMenu() {
		isOpen = !isOpen;
		if (isOpen) showProviderMenu = false;
	}

	function toggleProviderMenu() {
		showProviderMenu = !showProviderMenu;
	}
</script>

<header class="bg-white shadow-sm border-b border-gray-200">
	<nav
		class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center"
	>
		<div class="flex items-center gap-6">
			<a
				href="/"
				class="flex items-center gap-2 hover:opacity-80 transition-opacity"
			>
				<div
					class="w-8 h-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center"
				>
					<span class="text-white font-bold text-sm">AC</span>
				</div>
				<h1 class="text-xl font-semibold text-gray-900">
					AC Multiposter
				</h1>
			</a>

			<nav class="hidden md:flex gap-4">
				<a
					href="/imprint"
					class="text-sm font-medium text-gray-500 hover:text-gray-900"
					>Imprint</a
				>
				<a
					href="/GDPR"
					class="text-sm font-medium text-gray-500 hover:text-gray-900"
					>Data Privacy</a
				>
			</nav>
		</div>

		<div class="flex items-center gap-4">
			{#if loading}
				<div class="text-sm text-gray-600">Loading...</div>
			{:else if user}
				<div class="relative">
					<button
						onclick={toggleMenu}
						class="flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
					>
						{#if user.image}
							<img
								src={user.image}
								alt={user.name}
								class="w-6 h-6 rounded-full object-cover"
							/>
						{:else}
							<div
								class="w-6 h-6 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-xs font-semibold text-white"
							>
								{user.name?.charAt(0).toUpperCase() ||
									user.email?.charAt(0).toUpperCase()}
							</div>
						{/if}
						<span class="max-w-[150px] truncate"
							>{user.name || user.email}</span
						>
						<svg
							class="w-4 h-4 ml-1 transition-transform {isOpen
								? 'rotate-180'
								: ''}"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M19 14l-7 7m0 0l-7-7m7 7V3"
							/>
						</svg>
					</button>

					{#if isOpen}
						<div
							class="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50"
							role="menu"
							aria-orientation="vertical"
						>
							<div class="px-4 py-3 border-b border-gray-200">
								<p class="font-semibold text-gray-900">
									{user.name || user.email}
								</p>
								<p class="text-sm text-gray-500">
									{user.email}
								</p>
								{#if user.emailVerified}
									<p class="text-xs text-green-600 mt-1">
										✓ Verified
									</p>
								{/if}
							</div>
							<button
								onclick={handleSignOut}
								class="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-2"
								role="menuitem"
							>
								<svg
									class="w-4 h-4"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
								>
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
									/>
								</svg>
								Sign Out
							</button>
						</div>
					{/if}
				</div>
			{:else}
				<div class="relative">
					<button
						onclick={toggleProviderMenu}
						disabled={signingIn}
						class="px-4 py-2 rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
					>
						{#if signingIn}
							<svg
								class="w-4 h-4 animate-spin"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
								/>
							</svg>
							Signing In...
						{:else}
							Sign In
						{/if}
						<svg
							class="w-4 h-4 transition-transform {showProviderMenu
								? 'rotate-180'
								: ''}"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M19 14l-7 7m0 0l-7-7m7 7V3"
							/>
						</svg>
					</button>

					{#if showProviderMenu}
						<div
							class="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50"
							role="menu"
							aria-orientation="vertical"
						>
							<button
								onclick={() => handleSignIn("google")}
								disabled={signingIn}
								class="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
								role="menuitem"
							>
								<svg class="w-5 h-5" viewBox="0 0 24 24">
									<path
										fill="currentColor"
										d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
									/>
									<path
										fill="currentColor"
										d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
									/>
									<path
										fill="currentColor"
										d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
									/>
									<path
										fill="currentColor"
										d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
									/>
								</svg>
								Google
							</button>
							<button
								onclick={() => handleSignIn("microsoft")}
								disabled={signingIn}
								class="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
								role="menuitem"
							>
								<svg class="w-5 h-5" viewBox="0 0 23 23">
									<rect
										width="11"
										height="11"
										fill="#F25022"
									/>
									<rect
										x="12"
										width="11"
										height="11"
										fill="#7FBA00"
									/>
									<rect
										y="12"
										width="11"
										height="11"
										fill="#00A4EF"
									/>
									<rect
										x="12"
										y="12"
										width="11"
										height="11"
										fill="#FFB900"
									/>
								</svg>
								Microsoft
							</button>
						</div>
					{/if}
				</div>
			{/if}
		</div>
	</nav>
</header>

<style>
	:global(body) {
		margin: 0;
		padding: 0;
	}
</style>
