<script lang="ts">
	import { listEvents } from "./list.remote";
	import type { Event } from "./list.remote";
	import { deleteEvents } from "./delete.remote";
	import Breadcrumb from "$lib/components/ui/Breadcrumb.svelte";
	import Button from "$lib/components/ui/button/button.svelte";
	import AsyncButton from "$lib/components/ui/AsyncButton.svelte";
	import { Calendar } from "@lucide/svelte";
	import LoadingSection from "$lib/components/ui/LoadingSection.svelte";
	import ErrorSection from "$lib/components/ui/ErrorSection.svelte";
	import BulkActionToolbar from "$lib/components/ui/BulkActionToolbar.svelte";
	import { handleDelete } from "$lib/hooks/handleDelete.svelte";
	import EmptyState from "$lib/components/ui/EmptyState.svelte";
	import { toast } from "svelte-sonner";
	import { invalidateAll } from "$app/navigation";

	let itemsPromise = $state<Promise<Event[]>>(listEvents());
	let initializedItems = $state<Event[]>([]);
	let selectedIds = $state<Set<string>>(new Set());
	let eventSource: EventSource | null = null;

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
		if (event.startDate) {
			return `All day on ${event.startDate}`;
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

	function setupSSE() {
		if (eventSource) {
			eventSource.close();
		}

		eventSource = new EventSource("/api/events/sse");

		eventSource.addEventListener("event-created", () => {
			toast.info("New event created remotely");
			invalidateAll();
		});

		eventSource.addEventListener("event-updated", () => {
			toast.info("Event updated remotely");
			invalidateAll();
		});

		eventSource.addEventListener("event-deleted", () => {
			toast.info("Event deleted remotely");
			invalidateAll();
		});

		eventSource.onerror = (error) => {
			console.error("SSE connection error:", error);
			eventSource?.close();
		};
	}

	$effect(() => {
		return () => {
			eventSource?.close();
		};
	});
</script>

<div class="container mx-auto px-4 py-8">
	<div class="max-w-4xl mx-auto">
		<Breadcrumb feature="events" />
		<div class="bg-white shadow rounded-lg p-6">
			<div class="flex justify-between items-center mb-6 gap-4">
				<h1 class="text-3xl font-bold flex-shrink-0">
					Calendar Events
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
				{@html (() => {
					initializedItems = items;
					setupSSE();
					return "";
				})()}

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
									class="bg-white shadow rounded-lg p-6 flex items-start gap-4 transition-shadow"
								>
									<input
										type="checkbox"
										checked={isSelected(event.id)}
										onchange={() =>
											toggleSelection(event.id)}
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
														href={`/events/${event.id}`}
														class="hover:underline text-blue-600"
													>
														{event.summary}
													</a>
												</h2>
											</div>
										</div>
										<div class="flex flex-col gap-1 mt-1">
											<span class="text-xs text-gray-500"
												>{formatEventTime(event)}</span
											>
											{#if event.location}
												<span
													class="text-xs text-gray-400 truncate"
													>{event.location}</span
												>
											{/if}
										</div>
									</div>
									<div class="flex flex-col gap-2 shrink-0">
										<Button
											href={`/events/${event.id}`}
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
														ids: [event.id],
														deleteFn: deleteEvents,
														itemName: "event",
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
					headline="Failed to load events"
					message={error?.message || "An unexpected error occurred."}
					href="/events"
					button="Retry"
				/>
			{/await}
		</div>
	</div>
</div>
