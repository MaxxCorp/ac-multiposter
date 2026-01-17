<script lang="ts">
	import { page } from "$app/state";
	import { goto } from "$app/navigation";
	import { view, getOperations } from "./view.remote";
	import {
		updateSynchronization as update,
		type UpdateSynchronizationInput as UpdateSyncInput,
	} from "./update.remote";
	import { updateSynchronizationSchema } from "$lib/validations/synchronizations";
	import { removeBulk } from "./delete.remote";
	import { sync } from "./sync.remote";
	import DashboardCard from "$lib/components/ui/DashboardCard.svelte";
	import Breadcrumb from "$lib/components/ui/Breadcrumb.svelte";
	import AsyncButton from "$lib/components/ui/AsyncButton.svelte";
	import LoadingSection from "$lib/components/ui/LoadingSection.svelte";
	import ErrorSection from "$lib/components/ui/ErrorSection.svelte";
	import { handleDelete } from "$lib/hooks/handleDelete.svelte";
	import { toast } from "svelte-sonner";
	import {
		Calendar,
		RefreshCw,
		Settings,
		Trash2,
		CircleCheck,
		CircleX,
		Clock,
		CircleAlert,
	} from "@lucide/svelte";

	const configId = page.params.id!;
	type SyncSettings = { calendarId?: string; syncIntervalMinutes?: number };

	// Version tracker for re-fetching data after actions
	let version = $state(0);
	let isSyncing = $state(false);
	let syncError = $state<string | null>(null);

	// Derived promises that re-fetch when version changes
	let configPromise = $derived.by(() => {
		version;
		return view(configId);
	});

	let operationsPromise = $derived.by(() => {
		version;
		return getOperations(configId);
	});

	async function triggerSync() {
		try {
			isSyncing = true;
			syncError = null;
			await sync(configId);
			version++; // Trigger re-fetch
			toast.success("Sync completed successfully!");
		} catch (e: any) {
			syncError = e.message;
			toast.error("Sync failed: " + e.message);
		} finally {
			isSyncing = false;
		}
	}

	function formatDate(date: Date | null) {
		if (!date) return "Never";
		return new Date(date).toLocaleString();
	}

	function getProviderLabel(providerType: string) {
		if (providerType === "google-calendar") return "Google Calendar";
		if (providerType === "microsoft-calendar") return "Microsoft Calendar";
		return providerType;
	}

	function getDirectionLabel(direction: string) {
		if (direction === "pull") return "Pull Only";
		if (direction === "push") return "Push Only";
		if (direction === "bidirectional") return "Bidirectional";
		return direction;
	}

	function getStatusIcon(status: string) {
		if (status === "completed") return CircleCheck;
		if (status === "failed") return CircleX;
		if (status === "pending") return Clock;
		return CircleAlert;
	}
	function getStatusColor(status: string) {
		if (status === "completed") return "text-green-600";
		if (status === "failed") return "text-red-600";
		if (status === "pending") return "text-yellow-600";
		return "text-gray-600";
	}

	function getOperationLabel(operation: string) {
		if (operation === "pull") return "Pull";
		if (operation === "push") return "Push";
		if (operation === "delete") return "Delete";
		return operation;
	}
</script>

<svelte:head>
	{#await configPromise then config}
		<title>
			{config
				? getProviderLabel(config.providerType) + " Sync"
				: "Calendar Sync"}
		</title>
	{:catch}
		<title>Calendar Sync</title>
	{/await}
</svelte:head>

<div class="container mx-auto px-4 py-8">
	{#await configPromise}
		<Breadcrumb feature="synchronizations" />
		<LoadingSection message="Loading sync configuration..." />
	{:then config}
		{#if config}
			<div class="max-w-4xl mx-auto">
				<Breadcrumb
					feature="synchronizations"
					current={config.providerId}
				/>

				<div class="space-y-4">
					<!-- Header -->
					<div
						class="bg-white shadow rounded-lg p-6 flex items-start justify-between"
					>
						<div class="flex items-center gap-4">
							<div class="rounded-lg bg-blue-100 p-3">
								<Calendar class="h-8 w-8 text-blue-600" />
							</div>
							<div>
								<h1 class="text-3xl font-bold">
									{getProviderLabel(config.providerType)}
								</h1>
								<p class="text-gray-600">{config.providerId}</p>
							</div>
						</div>
						<div class="flex gap-2">
							<AsyncButton
								variant="default"
								loading={isSyncing}
								loadingLabel="Syncing..."
								onclick={triggerSync}
							>
								<RefreshCw
									class="h-4 w-4 mr-2 {isSyncing
										? 'animate-spin'
										: ''}"
								/>
								Sync Now
							</AsyncButton>
							<form
								{...update
									.preflight(updateSynchronizationSchema)
									.enhance(async ({ submit }) => {
										const result: any = await submit();
										if (result?.error) {
											toast.error(
												result.error.message ||
													"Failed to update status",
											);
											return;
										}
										version++; // Trigger re-fetch
										toast.success("Status updated");
									})}
								class="inline-block"
							>
								<input
									type="hidden"
									name="enabled"
									value={!config.enabled}
								/>
								<AsyncButton
									variant={config.enabled
										? "secondary"
										: "default"}
									loading={update.pending}
									loadingLabel={config.enabled
										? "Disabling..."
										: "Enabling..."}
									type="submit"
									class={config.enabled
										? "bg-gray-600 text-white hover:bg-gray-700"
										: "bg-green-600 text-white hover:bg-green-700"}
								>
									{config.enabled ? "Disable" : "Enable"}
								</AsyncButton>
							</form>
							<AsyncButton
								variant="destructive"
								loading={false}
								loadingLabel="Deleting..."
								onclick={async () => {
									const success = await handleDelete({
										ids: [configId],
										deleteFn: removeBulk,
										itemName: "synchronization",
									});
									if (success) {
										await goto("/synchronizations");
									}
								}}
							>
								<Trash2 class="h-4 w-4 mr-2" />
								Delete
							</AsyncButton>
						</div>
					</div>

					<!-- Status Info -->
					<div class="grid gap-6 md:grid-cols-2">
						<div class="bg-white shadow rounded-lg p-6 space-y-4">
							<h2
								class="text-lg font-semibold mb-4 flex items-center gap-2"
							>
								<Settings class="h-5 w-5" />
								Configuration
							</h2>
							<div class="space-y-3 text-sm">
								<div class="flex justify-between">
									<span class="text-gray-600">Status:</span>
									<span
										class="font-medium {config.enabled
											? 'text-green-600'
											: 'text-gray-400'}"
									>
										{config.enabled
											? "Enabled"
											: "Disabled"}
									</span>
								</div>
								<div class="flex justify-between">
									<span class="text-gray-600">Direction:</span
									>
									<span class="font-medium"
										>{getDirectionLabel(
											config.direction,
										)}</span
									>
								</div>
								<div class="flex justify-between">
									<span class="text-gray-600"
										>Calendar ID:</span
									>
									<span class="font-medium">
										{(config.settings as SyncSettings)
											?.calendarId || "primary"}
									</span>
								</div>
								<div class="flex justify-between">
									<span class="text-gray-600"
										>Sync Interval:</span
									>
									<span class="font-medium">
										{(config.settings as SyncSettings)
											?.syncIntervalMinutes || 60} minutes
									</span>
								</div>
								<div class="flex justify-between">
									<span class="text-gray-600">Webhooks:</span>
									<span
										class="font-medium {config.webhookId
											? 'text-green-600'
											: 'text-gray-400'}"
									>
										{config.webhookId
											? "Active"
											: "Inactive"}
									</span>
								</div>
							</div>
						</div>

						<div class="bg-white shadow rounded-lg p-6 space-y-4">
							<h2
								class="text-lg font-semibold mb-4 flex items-center gap-2"
							>
								<Clock class="h-5 w-5" />
								Sync Status
							</h2>
							<div class="space-y-3 text-sm">
								<div class="flex justify-between">
									<span class="text-gray-600">Last Sync:</span
									>
									<span class="font-medium"
										>{formatDate(config.lastSyncAt)}</span
									>
								</div>
								<div class="flex justify-between">
									<span class="text-gray-600">Next Sync:</span
									>
									<span class="font-medium"
										>{formatDate(config.nextSyncAt)}</span
									>
								</div>
								<div class="flex justify-between">
									<span class="text-gray-600">Created:</span>
									<span class="font-medium"
										>{formatDate(config.createdAt)}</span
									>
								</div>
								<div class="flex justify-between">
									<span class="text-gray-600">Updated:</span>
									<span class="font-medium"
										>{formatDate(config.updatedAt)}</span
									>
								</div>
							</div>
						</div>
					</div>

					<!-- Sync Result Messages -->
					{#if syncError}
						<div
							class="rounded-lg border border-red-200 bg-red-50 p-4"
						>
							<div class="flex items-start gap-3 text-red-600">
								<CircleAlert
									class="h-5 w-5 flex-shrink-0 mt-0.5"
								/>

								<div class="flex-1">
									<p class="font-semibold mb-1">
										Sync failed
									</p>
									<p class="text-sm">{syncError}</p>
									{#if syncError.includes("refresh token") || syncError.includes("re-authenticate")}
										<div
											class="mt-3 pt-3 border-t border-red-200"
										>
											<p class="text-sm font-medium mb-2">
												How to fix this:
											</p>
											<ol
												class="text-sm space-y-1 list-decimal list-inside"
											>
												<li>
													Delete this synchronization
													configuration
												</li>
												<li>
													Sign out and sign back in to
													your Google account
												</li>
												<li>
													Create a new synchronization
													- make sure to grant
													calendar access when
													prompted
												</li>
											</ol>
										</div>
									{/if}
								</div>
							</div>
						</div>
					{/if}

					<!-- Recent Operations -->
					<div class="bg-white shadow rounded-lg p-6 space-y-4">
						<h2 class="text-lg font-semibold mb-4">
							Recent Sync Operations
						</h2>
						{#await operationsPromise}
							<div class="flex justify-center py-8">
								<RefreshCw
									class="h-6 w-6 animate-spin text-gray-400"
								/>
							</div>
						{:then operations}
							{#if operations && operations.length === 0}
								<p class="text-gray-500 text-center py-8">
									No sync operations yet
								</p>
							{:else if operations}
								<div class="space-y-2">
									{#each operations as operation}
										{@const Icon = getStatusIcon(
											operation.status,
										)}
										{@const statusColor = getStatusColor(
											operation.status,
										)}
										<div
											class="border rounded-lg {operation.status ===
											'failed'
												? 'border-red-200 bg-red-50'
												: 'border-gray-200 bg-gray-50'}"
										>
											<div
												class="flex items-center justify-between p-3"
											>
												<div
													class="flex items-center gap-3"
												>
													<Icon
														class="h-5 w-5 {statusColor}"
													/>
													<div>
														<div
															class="font-medium"
														>
															{getOperationLabel(
																operation.operation,
															)}
															{operation.entityType}
														</div>
														<div
															class="text-xs text-gray-500"
														>
															{formatDate(
																operation.startedAt,
															)}
															{#if operation.completedAt}
																→ {formatDate(
																	operation.completedAt,
																)}
															{/if}
														</div>
													</div>
												</div>
												<div class="text-sm">
													<span
														class={`font-medium ${statusColor}`}
													>
														{operation.status}
													</span>
													{#if operation.retryCount > 0}
														<span
															class="text-gray-500 ml-2"
														>
															(retried {operation.retryCount}x)
														</span>
													{/if}
												</div>
											</div>
											{#if operation.error}
												<div
													class="mx-3 mb-3 text-sm text-red-700 bg-red-100 p-3 rounded border border-red-200"
												>
													<div
														class="font-semibold mb-1"
													>
														Error Details:
													</div>
													<pre
														class="whitespace-pre-wrap font-mono text-xs">{operation.error}</pre>
												</div>
											{/if}
										</div>
									{/each}
								</div>
							{/if}
						{:catch error}
							<div class="flex items-center gap-2 text-red-600">
								<CircleAlert class="h-5 w-5" />

								<p>
									Failed to load operations: {error instanceof
									Error
										? error.message
										: String(error)}
								</p>
							</div>
						{/await}
					</div>
				</div>
			</div>
		{:else}
			<Breadcrumb feature="synchronizations" />
			<ErrorSection
				headline="Sync Configuration Not Found"
				message="The synchronization configuration you are looking for does not exist."
				href="/synchronizations"
				button="Back to List"
			/>
		{/if}
	{:catch error}
		<Breadcrumb feature="synchronizations" />
		<ErrorSection
			headline="Failed to load sync configuration"
			message={error instanceof Error ? error.message : String(error)}
			href="/synchronizations"
			button="Back to List"
		/>
	{/await}
</div>
