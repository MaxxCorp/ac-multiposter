<script lang="ts">
	import { list } from "./list.remote";
	import { removeBulk } from "./[id]/delete.remote";
	import Breadcrumb from "$lib/components/ui/Breadcrumb.svelte";
	import Button from "$lib/components/ui/button/button.svelte";
	import AsyncButton from "$lib/components/ui/AsyncButton.svelte";
	import { Calendar, CheckCircle2, AlertCircle } from "@lucide/svelte";
	import LoadingSection from "$lib/components/ui/LoadingSection.svelte";
	import ErrorSection from "$lib/components/ui/ErrorSection.svelte";
	import BulkActionToolbar from "$lib/components/ui/BulkActionToolbar.svelte";
	import { handleDelete } from "$lib/hooks/handleDelete.svelte";
	import EmptyState from "$lib/components/ui/EmptyState.svelte";
	import WebhookToggleButton from "$lib/components/synchronizations/WebhookToggleButton.svelte";

	// Type definition for the list items
	type SyncConfig = Awaited<ReturnType<typeof list>>[number];

	let itemsPromise = $state<Promise<SyncConfig[]>>(list());
	let initializedItems = $state<SyncConfig[]>([]);
	let selectedIds = $state<Set<string>>(new Set());

	function isSelected(id: string) {
		return selectedIds.has(id);
	}
	function toggleSelection(id: string) {
		if (selectedIds.has(id)) {
			selectedIds.delete(id);
		} else {
			selectedIds.add(id);
		}
		selectedIds = new Set(selectedIds);
	}
	function selectAll(items: SyncConfig[]) {
		selectedIds = new Set(items.map((item) => item.id));
	}
	function deselectAll() {
		selectedIds = new Set();
	}

	function formatDate(date: Date | null) {
		if (!date) return "Never";
		return new Date(date).toLocaleString();
	}

	function getProviderIcon(providerType: string) {
		if (providerType === "google-calendar") return Calendar;
		return Calendar;
	}

	function getProviderLabel(providerType: string) {
		if (providerType === "google-calendar") return "Google Calendar";
		if (providerType === "microsoft-calendar") return "Microsoft Calendar";
		if (providerType === "berlin-de-main-calendar") return "Berlin.de (Main Calendar)";
		if (providerType === "wp-the-events-calendar") return "WP The Events Calendar";
		return providerType;
	}

	function getDirectionLabel(direction: string) {
		if (direction === "pull") return "Pull Only";
		if (direction === "push") return "Push Only";
		if (direction === "bidirectional") return "Bidirectional";
		return direction;
	}

	function getStatusColor(enabled: boolean, lastSyncAt: Date | null) {
		if (!enabled) return "text-gray-400";
		if (!lastSyncAt) return "text-yellow-500";
		const hoursSinceSync =
			(Date.now() - new Date(lastSyncAt).getTime()) / (1000 * 60 * 60);
		if (hoursSinceSync > 24) return "text-orange-500";
		return "text-green-500";
	}
</script>

<svelte:head>
	<title>Synchronizations</title>
</svelte:head>

<div class="container mx-auto px-4 py-8">
	<div class="max-w-4xl mx-auto">
		<Breadcrumb feature="synchronizations" />
		<div class="bg-white shadow rounded-lg p-6">
			<div class="flex justify-between items-center mb-6 gap-4">
				<h1 class="text-3xl font-bold flex-shrink-0">
					Synchronizations
				</h1>
				<div class="flex-1 flex justify-end">
					<BulkActionToolbar
						selectedCount={selectedIds.size}
						totalCount={initializedItems.length}
						onSelectAll={() => selectAll(initializedItems)}
						onDeselectAll={deselectAll}
						onDelete={async () => {
							await handleDelete({
								ids: [...selectedIds],
								deleteFn: removeBulk,
								itemName: "synchronization",
							});
							deselectAll();
						}}
						newItemHref="/synchronizations/new"
						newItemLabel="+ New Sync"
					/>
				</div>
			</div>

			{#await itemsPromise}
				<LoadingSection message="Loading synchronizations..." />
			{:then items}
				{@html (() => {
					initializedItems = items;
					return "";
				})()}

				<div class="grid gap-4">
					{#if items.length === 0}
						<EmptyState
							icon={Calendar}
							title="No Synchronizations"
							description="Get started by connecting your first calendar service"
							actionLabel="Add Your First Sync"
							actionHref="/synchronizations/new"
						/>
					{:else}
						{#each items as config (config.id)}
							{@const Icon = getProviderIcon(config.providerType)}
							{@const statusColor = getStatusColor(
								config.enabled,
								config.lastSyncAt,
							)}
							<div class="mb-6 last:mb-0">
								<div
									class="bg-white shadow rounded-lg p-6 flex items-start gap-4 transition-shadow"
								>
									<input
										type="checkbox"
										checked={isSelected(config.id)}
										onchange={() =>
											toggleSelection(config.id)}
										class="mt-1 w-4 h-4 text-blue-600"
									/>
									<div class="flex-1">
										<div
											class="flex items-start gap-3 mb-2"
										>
											<div class="flex-1">
												<h2
													class="text-xl font-semibold"
												>
													<a
														href={`/synchronizations/${config.id}`}
														class="hover:underline text-blue-600 flex items-center gap-2"
													>
														<Icon class="h-5 w-5" />
														{getProviderLabel(
															config.providerType,
														)}
													</a>
												</h2>
												<p
													class="text-sm text-gray-500"
												>
													{config.providerId}
												</p>
											</div>
											<div class={statusColor}>
												{#if config.enabled}
													<CheckCircle2
														class="h-5 w-5"
													/>
												{:else}
													<AlertCircle
														class="h-5 w-5"
													/>
												{/if}
											</div>
										</div>

										<div class="space-y-1 text-sm mt-2">
											<div class="flex gap-2">
												<span class="text-gray-600"
													>Direction:</span
												>
												<span class="font-medium"
													>{getDirectionLabel(
														config.direction,
													)}</span
												>
											</div>
											<div class="flex gap-2">
												<span class="text-gray-600"
													>Status:</span
												>
												<span
													class={`font-medium ${config.enabled ? "text-green-600" : "text-gray-400"}`}
												>
													{config.enabled
														? "Enabled"
														: "Disabled"}
												</span>
											</div>
											<div class="flex gap-2">
												<span class="text-gray-600"
													>Last Sync:</span
												>
												<span class="font-medium"
													>{formatDate(
														config.lastSyncAt,
													)}</span
												>
											</div>
										</div>
									</div>
									<div class="flex flex-col gap-2 shrink-0">
										<WebhookToggleButton
											configId={config.id}
											providerType={config.providerType}
											direction={config.direction}
										/>
										<Button
											href={`/synchronizations/${config.id}`}
											variant="default"
											size="default"
											class="text-center"
										>
											Edit
										</Button>
										<AsyncButton
											variant="destructive"
											size="default"
											loading={false}
											loadingLabel="Deleting..."
											onclick={async () => {
												const success =
													await handleDelete({
														ids: [config.id],
														deleteFn: removeBulk,
														itemName:
															"synchronization",
													});
												if (success) {
													deselectAll();
												}
											}}
										>
											Delete
										</AsyncButton>
									</div>
								</div>
							</div>
						{/each}
					{/if}
				</div>
			{:catch error}
				<ErrorSection
					headline="Failed to load synchronizations"
					message={error?.message || "An unexpected error occurred."}
					href="/synchronizations"
					button="Retry"
				/>
			{/await}
		</div>
	</div>
</div>
