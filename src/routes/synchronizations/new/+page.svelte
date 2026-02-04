<script lang="ts">
	import { create } from "./create.remote";
	import { goto } from "$app/navigation";
	import { createSynchronizationSchema } from "$lib/validations/synchronizations";
	import {
		Calendar,
		ArrowLeft,
		ArrowRight,
		ArrowLeftRight,
		Mail,
		Users,
		MapPin,
	} from "@lucide/svelte";
	import Breadcrumb from "$lib/components/ui/Breadcrumb.svelte";
	import Button from "$lib/components/ui/button/button.svelte";
	import AsyncButton from "$lib/components/ui/AsyncButton.svelte";
	import { toast } from "svelte-sonner";

	let selectedProvider = $state<
		| "google-calendar"
		| "microsoft-calendar"
		| "berlin-de-main-calendar"
		| "wp-the-events-calendar"
		| "eventbrite"
		| "meetup"
		| "seniorennetz-berlin"
		| "bewegungsatlas-berlin"
		| "email"
		| null
	>(null);
	let providerId = $state("");
	let direction = $state<"pull" | "push" | "bidirectional">("bidirectional");
	let calendarId = $state("primary");
	let syncIntervalMinutes = $state(60);
	let company = $state("");
	let fieldMappings = $state<Record<string, string>>({});
	let wpBaseUrl = $state("");
	let wpUsername = $state("");
	let wpAppPassword = $state("");

	// Set default direction based on provider
	$effect(() => {
		if (
			selectedProvider === "berlin-de-main-calendar" ||
			selectedProvider === "wp-the-events-calendar" ||
			selectedProvider === "eventbrite" ||
			selectedProvider === "meetup" ||
			selectedProvider === "seniorennetz-berlin" ||
			selectedProvider === "bewegungsatlas-berlin" ||
			selectedProvider === "email"
		) {
			direction = "push";
		}
	});

	const providers = [
		{
			id: "google-calendar" as const,
			name: "Google Calendar",
			description: "Sync with your Google Calendar",
			icon: Calendar,
			available: true,
		},
		{
			id: "microsoft-calendar" as const,
			name: "Microsoft Calendar",
			description: "Sync with Outlook/Microsoft 365",
			icon: Calendar,
			available: false,
		},
		{
			id: "berlin-de-main-calendar" as const,
			name: "Berlin.de (Main Calendar)",
			description: "Push events to main Berlin.de event calendar",
			icon: Calendar,
			available: true,
		},
		{
			id: "wp-the-events-calendar" as const,
			name: "WP The Events Calendar",
			description:
				"Push events to WordPress site with The Events Calendar plugin",
			icon: Calendar,
			available: true,
		},
		{
			id: "eventbrite" as const,
			name: "Eventbrite",
			description: "Sync with Eventbrite events",
			icon: Calendar,
			available: true,
		},
		{
			id: "meetup" as const,
			name: "Meetup",
			description: "Sync with Meetup.com groups",
			icon: Users,
			available: true,
		},
		{
			id: "seniorennetz-berlin" as const,
			name: "Seniorennetz Berlin",
			description: "Sync with Seniorennetz Berlin events",
			icon: Users,
			available: true,
		},
		{
			id: "bewegungsatlas-berlin" as const,
			name: "Bewegungsatlas Berlin",
			description: "Sync with Bewegungsatlas Berlin activities",
			icon: MapPin,
			available: true,
		},
		{
			id: "email" as const,
			name: "E-Mail (Brevo)",
			description: "Send email campaigns via Brevo",
			icon: Mail,
			available: true,
		},
	];

	const directions = [
		{
			value: "pull" as const,
			label: "Pull Only",
			description: "Import events from external calendar to this app",
			icon: ArrowLeft,
		},
		{
			value: "push" as const,
			label: "Push Only",
			description: "Export events from this app to external calendar",
			icon: ArrowRight,
		},
		{
			value: "bidirectional" as const,
			label: "Bidirectional",
			description: "Keep both calendars in sync",
			icon: ArrowLeftRight,
		},
	];

	function getField(name: string): any {
		if (!(create as any).fields) return {};
		const parts = name.split(".");
		let current = (create as any).fields;
		for (const part of parts) {
			if (!current) return {};
			current = current[part];
		}
		return current || {};
	}
</script>

<svelte:head>
	<title>Add Calendar Sync</title>
</svelte:head>

<div class="container mx-auto px-4 py-8 max-w-4xl">
	<Breadcrumb feature="synchronizations" current="Add Calendar Sync" />

	<div class="mb-8">
		<h1 class="text-3xl font-bold">Add Calendar Sync</h1>
		<p class="text-gray-600 mt-2">
			Connect a calendar service to synchronize your events
		</p>
	</div>

	<form
		class="space-y-4"
		{...create
			.preflight(createSynchronizationSchema)
			.enhance(async ({ submit }) => {
				const result: any = await submit();
				if (result?.error) {
					toast.error(
						result.error.message ||
							"Failed to create synchronization",
					);
					return;
				}
				toast.success("Calendar synchronization created successfully!");
				await goto("/synchronizations");
			})}
		onkeydown={(event) => {
			if (event.key === "Enter") {
				const target = event.target as HTMLElement;
				if (
					target.tagName !== "TEXTAREA" &&
					target.getAttribute("type") !== "submit"
				) {
					event.preventDefault();
				}
			}
		}}
	>
		<!-- Hidden Inputs required for form submission -->
		{#if selectedProvider}
			<input
				{...getField("providerType").as("hidden", selectedProvider)}
			/>
		{/if}
		<!-- providerId is handled by the text input below -->

		<!-- Settings as JSON string to avoid dot-notation parsing issues -->

		<!-- Provider Selection -->
		<div class="bg-white shadow rounded-lg p-6 space-y-4">
			<h2 class="text-xl font-semibold mb-4">Select Calendar Provider</h2>
			<div class="grid gap-4 md:grid-cols-2">
				{#each providers as provider}
					{@const Icon = provider.icon}
					<button
						type="button"
						disabled={!provider.available}
						class="text-left p-4 rounded-lg border-2 transition-all {selectedProvider ===
						provider.id
							? 'border-blue-600 bg-blue-50'
							: provider.available
								? 'border-gray-200 hover:border-gray-300'
								: 'border-gray-100 bg-gray-50 opacity-50 cursor-not-allowed'}"
						onclick={() =>
							provider.available &&
							(selectedProvider = provider.id)}
					>
						<div class="flex items-start gap-3">
							<div
								class="rounded-lg p-2 {selectedProvider ===
								provider.id
									? 'bg-blue-200'
									: 'bg-gray-100'}"
							>
								<Icon
									class="h-6 w-6 {selectedProvider ===
									provider.id
										? 'text-blue-600'
										: 'text-gray-600'}"
								/>
							</div>
							<div class="flex-1">
								<h3 class="font-semibold">{provider.name}</h3>
								<p class="text-sm text-gray-600">
									{provider.description}
								</p>
								{#if !provider.available}
									<p class="text-xs text-orange-600 mt-1">
										Coming soon
									</p>
								{/if}
							</div>
						</div>
					</button>
				{/each}
			</div>
		</div>

		{#if selectedProvider}
			<!-- Configuration -->
			<div class="bg-white shadow rounded-lg p-6 space-y-4">
				<h2 class="text-xl font-semibold mb-4">Configuration</h2>
				<div class="space-y-4">
					<div>
						<label
							for="providerId"
							class="block text-sm font-medium text-gray-700 mb-1"
						>
							Sync Name
						</label>
						<input
							{...getField("providerId").as("text")}
							bind:value={providerId}
							placeholder="e.g., my-work-calendar"
							class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 {(getField(
								'providerId',
							).issues()?.length ?? 0) > 0
								? 'border-red-500'
								: ''}"
							onblur={() => create.validate()}
						/>
						{#each getField("providerId").issues() ?? [] as issue}
							<p class="text-xs text-red-600 mt-1">
								{issue.message}
							</p>
						{/each}
						<p class="text-xs text-gray-500 mt-1">
							A unique identifier for this sync configuration
						</p>
					</div>

					{#if selectedProvider === "google-calendar"}
						<div>
							<label
								for="calendarId"
								class="block text-sm font-medium text-gray-700 mb-1"
							>
								Calendar ID
							</label>
							<input
								{...getField("settings.calendarId").as("text")}
								id="calendarId"
								bind:value={calendarId}
								placeholder="primary"
								class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
							/>
							<p class="text-xs text-gray-500 mt-1">
								Use "primary" for your main calendar or specify
								a calendar ID
							</p>
						</div>
					{/if}

					{#if selectedProvider === "berlin-de-main-calendar"}
						<div>
							<label
								for="company"
								class="block text-sm font-medium text-gray-700 mb-1"
							>
								Company (Firma)
							</label>
							<input
								{...getField("settings.company").as("text")}
								id="company"
								bind:value={company}
								placeholder="Your organization name"
								class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
							/>
							<p class="text-xs text-gray-500 mt-1">
								Company name to include in event submissions
							</p>
						</div>
					{/if}

					{#if selectedProvider === "wp-the-events-calendar"}
						<div>
							<label
								for="wpBaseUrl"
								class="block text-sm font-medium text-gray-700 mb-1"
							>
								WordPress Site URL
							</label>
							<input
								{...getField("settings.baseUrl").as("url")}
								id="wpBaseUrl"
								bind:value={wpBaseUrl}
								placeholder="https://yoursite.com"
								class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
							/>
							<p class="text-xs text-gray-500 mt-1">
								The base URL of your WordPress site
							</p>
						</div>
						<div>
							<label
								for="wpUsername"
								class="block text-sm font-medium text-gray-700 mb-1"
							>
								WordPress Username
							</label>
							<input
								{...getField("settings.username").as("text")}
								id="wpUsername"
								bind:value={wpUsername}
								placeholder="admin"
								class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
							/>
							<p class="text-xs text-gray-500 mt-1">
								WordPress user with editor or administrator role
							</p>
						</div>
						<div>
							<label
								for="wpAppPassword"
								class="block text-sm font-medium text-gray-700 mb-1"
							>
								Application Password
							</label>
							<input
								{...getField("settings.applicationPassword").as(
									"password",
								)}
								id="wpAppPassword"
								bind:value={wpAppPassword}
								placeholder="abcd 1234 efgh 5678 ijkl"
								class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
							/>
							<p class="text-xs text-gray-500 mt-1">
								Application password generated in WordPress user
								profile
							</p>
						</div>
					{/if}

					<div>
						<label
							for="syncInterval"
							class="block text-sm font-medium text-gray-700 mb-1"
						>
							Sync Interval (minutes)
						</label>
						<input
							{...getField("settings.syncIntervalMinutes").as(
								"number",
							)}
							id="syncInterval"
							bind:value={syncIntervalMinutes}
							min="15"
							max="1440"
							class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
						/>
						<p class="text-xs text-gray-500 mt-1">
							How often to sync (15 minutes to 24 hours)
						</p>
					</div>
				</div>
			</div>

			<!-- Sync Direction -->
			<div class="bg-white shadow rounded-lg p-6 space-y-4">
				<h2 class="text-xl font-semibold mb-4">Sync Direction</h2>
				<div class="space-y-3">
					{#each directions as dir}
						{@const Icon = dir.icon}
						<label
							class="flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors {direction ===
							dir.value
								? 'border-blue-600 bg-blue-50'
								: 'border-gray-200 hover:border-gray-300'} {(selectedProvider ===
								'berlin-de-main-calendar' ||
								selectedProvider === 'wp-the-events-calendar' ||
								selectedProvider === 'seniorennetz-berlin' ||
								selectedProvider === 'email') &&
							dir.value !== 'push'
								? 'opacity-50 cursor-not-allowed'
								: ''}"
						>
							<input
								{...getField("direction").as(
									"radio",
									dir.value,
								)}
								checked={direction === dir.value}
								onchange={() => {
									direction = dir.value;
									create.validate();
								}}
								disabled={(selectedProvider ===
									"berlin-de-main-calendar" ||
									selectedProvider ===
										"wp-the-events-calendar" ||
									selectedProvider ===
										"seniorennetz-berlin" ||
									selectedProvider === "email") &&
									dir.value !== "push"}
								class="mt-1"
							/>
							<Icon
								class="h-5 w-5 mt-0.5 {direction === dir.value
									? 'text-blue-600'
									: 'text-gray-600'}"
							/>
							<div class="flex-1">
								<div class="font-medium">{dir.label}</div>
								<div class="text-sm text-gray-600">
									{dir.description}
								</div>
								{#if (selectedProvider === "berlin-de-main-calendar" || selectedProvider === "wp-the-events-calendar" || selectedProvider === "seniorennetz-berlin" || selectedProvider === "email") && dir.value !== "push"}
									<div class="text-xs text-orange-600 mt-1">
										Not supported for {selectedProvider ===
										"berlin-de-main-calendar"
											? "Berlin.de"
											: selectedProvider ===
												  "wp-the-events-calendar"
												? "WordPress Events Calendar"
												: selectedProvider ===
													  "seniorennetz-berlin"
													? "Seniorennetz Berlin"
													: "Email (Brevo)"}
									</div>
								{/if}
							</div>
						</label>
					{/each}
				</div>
			</div>

			<!-- Submit -->
			<div class="flex items-center justify-end gap-3">
				<Button
					variant="secondary"
					href="/synchronizations"
					size="default"
				>
					Cancel
				</Button>
				<AsyncButton
					type="submit"
					loadingLabel="Creating..."
					loading={create.pending}
				>
					Create Sync
				</AsyncButton>
			</div>
		{/if}
	</form>
</div>
