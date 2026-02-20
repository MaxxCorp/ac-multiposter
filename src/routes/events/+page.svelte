<script lang="ts">
	import { listEvents } from "./list.remote";
	import type { Event } from "./list.remote";
	import { deleteEvents } from "./delete.remote";
	import { deleteSeries } from "./[id]/delete-series.remote";
	import Breadcrumb from "$lib/components/ui/Breadcrumb.svelte";
	import Button from "$lib/components/ui/button/button.svelte";
	import AsyncButton from "$lib/components/ui/AsyncButton.svelte";
	import LoadingSection from "$lib/components/ui/LoadingSection.svelte";
	import ErrorSection from "$lib/components/ui/ErrorSection.svelte";
	import BulkActionToolbar from "$lib/components/ui/BulkActionToolbar.svelte";
	import { handleDelete } from "$lib/hooks/handleDelete.svelte";
	import EmptyState from "$lib/components/ui/EmptyState.svelte";
	import {
		Calendar,
		MapPin,
		Earth,
		Tag as TagIcon,
		Pencil,
		Trash2,
		ChevronDown,
		RefreshCw,
	} from "@lucide/svelte";
	import * as DropdownMenu from "$lib/components/ui/dropdown-menu";

	import { onMount } from "svelte";
	import { browser } from "$app/environment";
	import { goto } from "$app/navigation";
	// import * as Ably from "ably"; // Removing static import
	import { toast } from "svelte-sonner";

	let itemsPromise = $state<Promise<Event[]>>(listEvents());
	let resolvedItems = $state<Event[]>([]);
	let selectedIds = $state<Set<string>>(new Set());

	let realtime: any; // Declare realtime at a higher scope

	onMount(() => {
		if (browser) {
			// @ts-ignore
			import("ably")
				.then((AblyModule) => {
					const Ably = AblyModule.default;
					realtime = new Ably.Realtime({ authUrl: "/api/ably/auth" });
					const eventsChannel =
						realtime.channels.get("event-changes");
					eventsChannel.subscribe("change", (message: any) => {
						console.log("Event update received:", message.data);
						itemsPromise = listEvents();
						toast.info("Events updated", {
							description: "Refreshing list...",
						});
					});
				})
				.catch((e) => {
					console.error("Failed to connect to Ably:", e);
				});

			return () => {
				if (realtime) {
					realtime.close();
				}
			};
		}
	});

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
	function selectAll(items: Event[]) {
		selectedIds = new Set(items.map((item) => item.id));
	}
	function deselectAll() {
		selectedIds = new Set();
	}

	function formatEventTime(event: Event): string {
		if (event.isAllDay && event.startDateTime) {
			const startDateStr = new Date(
				event.startDateTime,
			).toLocaleDateString();
			if (event.endDateTime) {
				const endDateStr = new Date(
					event.endDateTime,
				).toLocaleDateString();
				if (startDateStr !== endDateStr) {
					return `All day: ${startDateStr} - ${endDateStr}`;
				}
			}
			return `All day on ${startDateStr}`;
		}

		if (event.startDateTime) {
			const start = new Date(event.startDateTime);
			const end = event.endDateTime ? new Date(event.endDateTime) : null;
			const dateStr = start.toLocaleDateString();
			const startTime = start.toLocaleTimeString([], {
				hour: "2-digit",
				minute: "2-digit",
			});
			if (end) {
				const endTime = end.toLocaleTimeString([], {
					hour: "2-digit",
					minute: "2-digit",
				});
				return `${dateStr}, ${startTime} - ${endTime}`;
			}
			return `${dateStr}, ${startTime}`;
		}
		return "Time not specified";
	}

	// Check if an event is part of a recurring series
	function isSeriesEvent(event: Event): boolean {
		return !!(
			(event as any).seriesId ||
			(event.recurrence && event.recurrence.length > 0) ||
			(event as any).recurringEventId
		);
	}

	$effect(() => {
		itemsPromise
			.then((items) => {
				resolvedItems = items;
			})
			.catch(() => {
				// Error handling is done in the {#await} block
			});
	});
</script>

<div class="container mx-auto px-4 py-8">
	<div class="max-w-4xl mx-auto">
		<Breadcrumb feature="events" />
		<div class="bg-white shadow rounded-lg p-6">
			<div
				class="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4"
			>
				<h1 class="text-3xl font-bold flex-shrink-0">Events</h1>
				<div class="flex-1 flex justify-end w-full md:w-auto">
					<BulkActionToolbar
						selectedCount={selectedIds.size}
						totalCount={resolvedItems.length}
						onSelectAll={() => selectAll(resolvedItems)}
						onDeselectAll={deselectAll}
						onDelete={async () => {
							await handleDelete({
								ids: [...selectedIds],
								deleteFn: deleteEvents,
								itemName: "event",
							});
							deselectAll();
						}}
						newItemHref="/events/new"
						newItemLabel="+ New Event"
					/>
				</div>
			</div>

			{#await itemsPromise}
				<LoadingSection message="Loading events..." />
			{:then items}
				<div class="grid gap-4">
					{#if items.length === 0}
						<EmptyState
							icon={Calendar}
							title="No Events"
							description="Get started by creating your first event"
							actionLabel="Create Your First Event"
							actionHref="/events/new"
						/>
					{:else}
						{#each items as event (event.id)}
							<div class="mb-6 last:mb-0">
								<div
									class="bg-white shadow rounded-lg p-6 flex flex-col sm:flex-row items-start gap-4 transition-shadow"
								>
									<input
										type="checkbox"
										checked={isSelected(event.id)}
										onchange={() =>
											toggleSelection(event.id)}
										class="mt-1 w-4 h-4 text-blue-600"
									/>
									<div class="flex-1 w-full min-w-0">
										<div
											class="flex items-start gap-3 mb-2"
										>
											<div class="flex-1 min-w-0">
												<h2
													class="text-xl font-semibold break-all text-pretty"
												>
													<a
														href={`/events/${event.id}/view`}
														class="hover:underline text-blue-600"
													>
														{event.summary}
													</a>
												</h2>
											</div>
										</div>
										<div class="flex flex-col gap-1 mt-1">
											<div
												class="flex items-center gap-2"
											>
												<Calendar
													size={14}
													class="text-blue-500"
												/>
												<span
													class="text-xs text-gray-500 break-all text-pretty"
													>{formatEventTime(
														event,
													)}</span
												>
											</div>
											{#if event.location}
												<div
													class="flex items-center gap-2 min-w-0"
												>
													<MapPin
														size={14}
														class="text-red-500 shrink-0"
													/>
													<span
														class="text-xs text-gray-400 break-all text-pretty"
														>{event.location}</span
													>
												</div>
											{/if}
											<div
												class="flex flex-wrap items-center gap-2 mt-1"
											>
												{#if event.isPublic}
													<div
														class="flex items-center gap-1 bg-green-50 px-2 py-0.5 rounded-full border border-green-100"
													>
														<Earth
															size={12}
															class="text-green-600"
														/>
														<span
															class="text-[10px] text-green-700 font-medium"
															>Public</span
														>
													</div>
												{/if}
												{#if event.tags && event.tags.length > 0}
													{#each event.tags as tag}
														<span
															class="px-2 py-0.5 bg-indigo-50 text-indigo-700 text-[10px] font-medium rounded-full border border-indigo-100 flex items-center gap-1"
														>
															<TagIcon
																size={12}
															/>
															{tag}
														</span>
													{/each}
												{/if}
											</div>
										</div>
									</div>
									<div
										class="flex flex-col gap-2 shrink-0 items-end"
									>
										{#if isSeriesEvent(event)}
											<DropdownMenu.Root>
												<DropdownMenu.Trigger>
													<Button
														variant="default"
														size="default"
														class="flex items-center gap-2 w-[120px] justify-start"
														><Pencil size={16} />
														<span class="ml-auto"
															>Edit</span
														>
														<ChevronDown
															size={14}
															class="ml-auto"
														/></Button
													>
												</DropdownMenu.Trigger>
												<DropdownMenu.Content
													align="end"
												>
													<DropdownMenu.Item
														onclick={() =>
															goto(
																`/events/${event.id}`,
															)}
														><Pencil
															size={14}
															class="mr-2"
														/> Edit Instance</DropdownMenu.Item
													>
													<DropdownMenu.Item
														onclick={() =>
															goto(
																`/events/${event.recurringEventId || event.id}?editSeries=true`,
															)}
														><RefreshCw
															size={14}
															class="mr-2"
														/> Edit Series</DropdownMenu.Item
													>
												</DropdownMenu.Content>
											</DropdownMenu.Root>
											<DropdownMenu.Root>
												<DropdownMenu.Trigger>
													<Button
														variant="destructive"
														size="default"
														class="flex items-center gap-2 w-[120px] justify-start"
														><Trash2 size={16} />
														<span class="ml-auto"
															>Delete</span
														>
														<ChevronDown
															size={14}
															class="ml-auto"
														/></Button
													>
												</DropdownMenu.Trigger>
												<DropdownMenu.Content
													align="end"
												>
													<DropdownMenu.Item
														onclick={async () => {
															await handleDelete({
																ids: [event.id],
																deleteFn:
																	deleteEvents,
																itemName:
																	"event",
															});
															deselectAll();
														}}
														><Trash2
															size={14}
															class="mr-2"
														/> Delete Instance</DropdownMenu.Item
													>
													<DropdownMenu.Item
														onclick={async () => {
															if (
																!confirm(
																	"Delete all events in this series?",
																)
															)
																return;
															await deleteSeries(
																event.id,
															);
															toast.success(
																"Series deleted",
															);
															itemsPromise =
																listEvents();
															deselectAll();
														}}
														><RefreshCw
															size={14}
															class="mr-2"
														/> Delete Series</DropdownMenu.Item
													>
												</DropdownMenu.Content>
											</DropdownMenu.Root>
										{:else}
											<Button
												href={`/events/${event.id}`}
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
													const success =
														await handleDelete({
															ids: [event.id],
															deleteFn:
																deleteEvents,
															itemName: "event",
														});
													if (success) {
														deselectAll();
													}
												}}
											>
												<Trash2 size={16} /> Delete
											</AsyncButton>
										{/if}
									</div>
								</div>
							</div>
						{/each}
					{/if}
				</div>
			{:catch error}
				<ErrorSection
					headline="Failed to load events"
					message={error?.message || "An unexpected error occurred."}
					href="/events"
					button="Retry"
				/>
			{/await}
		</div>
	</div>
</div>
