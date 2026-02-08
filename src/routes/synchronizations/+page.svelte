<script lang="ts">
	import { list } from "./list.remote";
	import { removeBulk } from "./[id]/delete.remote";
	import { getEmailCampaigns } from "./email-campaigns.remote";
	import Breadcrumb from "$lib/components/ui/Breadcrumb.svelte";
	import Button from "$lib/components/ui/button/button.svelte";
	import AsyncButton from "$lib/components/ui/AsyncButton.svelte";
	import {
		Calendar,
		CircleCheck,
		CircleAlert,
		ChevronDown,
		ChevronRight,
		Mail,
		Eye,
		MousePointer,
		TriangleAlert,
		CircleX,
		UserX,
		Pencil,
		Trash2,
	} from "@lucide/svelte";

	import LoadingSection from "$lib/components/ui/LoadingSection.svelte";
	import ErrorSection from "$lib/components/ui/ErrorSection.svelte";
	import BulkActionToolbar from "$lib/components/ui/BulkActionToolbar.svelte";
	import { handleDelete } from "$lib/hooks/handleDelete.svelte";
	import EmptyState from "$lib/components/ui/EmptyState.svelte";
	import WebhookToggleButton from "$lib/components/synchronizations/WebhookToggleButton.svelte";

	// Type definition for the list items
	type SyncConfig = Awaited<ReturnType<typeof list>>[number];
	type EmailCampaign = {
		id: string;
		eventSummary: string;
		sentAt: Date;
		recipientCount: number;
		brevoCampaignId: string | null;
		events: Array<{
			recipientEmail: string;
			eventType: string;
			occurredAt: Date;
		}>;
	};

	let itemsPromise = $state<Promise<SyncConfig[]>>(list());
	let initializedItems = $state<SyncConfig[]>([]);
	let selectedIds = $state<Set<string>>(new Set());
	let expandedCampaigns = $state<Set<string>>(new Set());
	let campaignsData = $state<
		Map<
			string,
			{ campaigns: EmailCampaign[]; hasMore: boolean; loading: boolean }
		>
	>(new Map());

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
		if (providerType === "email") return Mail;
		return Calendar;
	}

	function getProviderLabel(providerType: string) {
		if (providerType === "google-calendar") return "Google Calendar";
		if (providerType === "microsoft-calendar") return "Microsoft Calendar";
		if (providerType === "berlin-de-main-calendar")
			return "Berlin.de (Main Calendar)";
		if (providerType === "wp-the-events-calendar")
			return "WP The Events Calendar";
		if (providerType === "email") return "E-Mail (Brevo)";
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

	function toggleCampaignsExpansion(syncConfigId: string) {
		if (expandedCampaigns.has(syncConfigId)) {
			expandedCampaigns.delete(syncConfigId);
		} else {
			expandedCampaigns.add(syncConfigId);
			// Load campaigns if not already loaded
			loadCampaigns(syncConfigId);
		}
		expandedCampaigns = new Set(expandedCampaigns);
	}

	async function loadCampaigns(syncConfigId: string, append = false) {
		const currentData = campaignsData.get(syncConfigId) || {
			campaigns: [],
			hasMore: true,
			loading: false,
		};
		if (currentData.loading) return;

		campaignsData.set(syncConfigId, { ...currentData, loading: true });
		campaignsData = new Map(campaignsData);

		try {
			const offset = append ? currentData.campaigns.length : 0;
			const newCampaigns = await getEmailCampaigns({
				configId: syncConfigId,
				limit: 10,
				offset,
			});

			const updatedCampaigns = append
				? [...currentData.campaigns, ...newCampaigns]
				: newCampaigns;
			const hasMore = newCampaigns.length === 10;

			campaignsData.set(syncConfigId, {
				campaigns: updatedCampaigns,
				hasMore,
				loading: false,
			});
		} catch (error) {
			console.error("Failed to load email campaigns:", error);
			campaignsData.set(syncConfigId, { ...currentData, loading: false });
		}

		campaignsData = new Map(campaignsData);
	}

	function getEventIcon(eventType: string) {
		switch (eventType) {
			case "delivered":
				return CircleCheck;
			case "opened":
				return Eye;
			case "click":
			case "clicked":
				return MousePointer;
			case "hardBounce":
			case "softBounce":
			case "bounced":
				return TriangleAlert;
			case "spam":
			case "complained":
				return CircleX;
			case "unsubscribed":
				return UserX;
			default:
				return Mail;
		}
	}

	function getEventColor(eventType: string) {
		switch (eventType) {
			case "delivered":
				return "text-green-600";
			case "opened":
				return "text-blue-600";
			case "click":
			case "clicked":
				return "text-purple-600";
			case "hardBounce":
			case "softBounce":
			case "bounced":
				return "text-red-600";
			case "spam":
			case "complained":
				return "text-orange-600";
			case "unsubscribed":
				return "text-gray-600";
			default:
				return "text-gray-500";
		}
	}

	function formatEventType(eventType: string) {
		switch (eventType) {
			case "delivered":
				return "Delivered";
			case "opened":
				return "Opened";
			case "click":
			case "clicked":
				return "Clicked";
			case "hardBounce":
				return "Hard Bounce";
			case "softBounce":
				return "Soft Bounce";
			case "bounced":
				return "Bounced";
			case "spam":
			case "complained":
				return "Spam / Complained";
			case "unsubscribed":
				return "Unsubscribed";
			default:
				return eventType;
		}
	}
</script>

<svelte:head>
	<title>Synchronizations</title>
</svelte:head>

<div class="max-w-4xl mx-auto">
	<Breadcrumb feature="synchronizations" />
	<div class="bg-white shadow rounded-lg p-6">
		<div
			class="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4"
		>
			<h1 class="text-3xl font-bold flex-shrink-0">Synchronizations</h1>
			<div class="flex-1 flex justify-end w-full md:w-auto">
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
								class="bg-white shadow rounded-lg p-6 flex flex-col sm:flex-row items-start gap-4 transition-shadow"
							>
								<input
									type="checkbox"
									checked={isSelected(config.id)}
									onchange={() => toggleSelection(config.id)}
									class="mt-1 w-4 h-4 text-blue-600"
								/>
								<div class="flex-1 w-full min-w-0">
									<div class="flex items-start gap-3 mb-2">
										<div class="flex-1 min-w-0">
											<h2 class="text-xl font-semibold">
												<a
													href={`/synchronizations/${config.id}`}
													class="hover:underline text-blue-600 flex items-center gap-2"
												>
													<Icon
														class="h-5 w-5 flex-shrink-0"
													/>
													{getProviderLabel(
														config.providerType,
													)}
												</a>
											</h2>
											<p
												class="text-sm text-gray-500 break-all"
											>
												{config.providerId}
											</p>
										</div>
										<div class={statusColor}>
											{#if config.enabled}
												<CircleCheck class="h-5 w-5" />
											{:else}
												<CircleAlert class="h-5 w-5" />
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

									{#if config.providerType === "email"}
										<div class="mt-4 border-t pt-4">
											<button
												class="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-gray-900"
												onclick={() =>
													toggleCampaignsExpansion(
														config.id,
													)}
											>
												{#if expandedCampaigns.has(config.id)}
													<ChevronDown
														class="h-4 w-4"
													/>
												{:else}
													<ChevronRight
														class="h-4 w-4"
													/>
												{/if}
												Campaigns
											</button>

											{#if expandedCampaigns.has(config.id)}
												{@const campaignData =
													campaignsData.get(
														config.id,
													)}
												<div class="mt-3 space-y-3">
													{#if campaignData?.campaigns.length === 0 && !campaignData.loading}
														<p
															class="text-sm text-gray-500"
														>
															No campaigns sent
															yet.
														</p>
													{:else}
														{#each campaignData?.campaigns || [] as campaign}
															<div
																class="border rounded-lg p-3 bg-gray-50"
															>
																<div
																	class="flex items-center justify-between mb-2"
																>
																	<h4
																		class="font-medium text-sm"
																	>
																		{campaign.eventSummary}
																	</h4>
																	<span
																		class="text-xs text-gray-500"
																	>
																		{new Date(
																			campaign.sentAt,
																		).toLocaleDateString()}
																		{new Date(
																			campaign.sentAt,
																		).toLocaleTimeString()}
																	</span>
																</div>
																<div
																	class="space-y-1"
																>
																	{#each campaign.events as event}
																		{@const EventIcon =
																			getEventIcon(
																				event.eventType,
																			)}
																		<div
																			class="flex items-center gap-2 text-xs"
																		>
																			<EventIcon
																				class={`h-3 w-3 ${getEventColor(event.eventType)}`}
																			/>
																			<span
																				class="text-gray-600"
																				>{event.recipientEmail}</span
																			>
																			<span
																				class={`font-medium ${getEventColor(event.eventType)}`}
																			>
																				{formatEventType(
																					event.eventType,
																				)}
																			</span>
																			<span
																				class="text-gray-400 ml-auto"
																			>
																				{new Date(
																					event.occurredAt,
																				).toLocaleString()}
																			</span>
																		</div>
																	{/each}
																</div>
															</div>
														{/each}

														{#if campaignData?.loading}
															<div
																class="text-center py-2"
															>
																<div
																	class="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-gray-900"
																></div>
															</div>
														{:else if campaignData?.hasMore}
															<div
																class="text-center pt-2"
															>
																<Button
																	variant="outline"
																	size="sm"
																	onclick={() =>
																		loadCampaigns(
																			config.id,
																			true,
																		)}
																>
																	Load More
																	Campaigns
																</Button>
															</div>
														{/if}
													{/if}
												</div>
											{/if}
										</div>
									{/if}
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
										class="flex items-center gap-2 w-[120px] justify-center"
									>
										<Pencil size={16} /> Edit
									</Button>
									<AsyncButton
										variant="destructive"
										size="default"
										loading={false}
										loadingLabel="Deleting..."
										class="flex items-center gap-2 w-[120px] justify-center"
										onclick={async () => {
											const success = await handleDelete({
												ids: [config.id],
												deleteFn: removeBulk,
												itemName: "synchronization",
											});
											if (success) {
												deselectAll();
											}
										}}
									>
										<Trash2 size={16} /> Delete
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
