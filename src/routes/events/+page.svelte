<script lang="ts">
	import { listEvents } from "./list.remote";
	import type { Event } from "./list.remote";
	import { deleteEvents } from "./delete.remote";
	import Breadcrumb from "$lib/components/ui/Breadcrumb.svelte";
	import Button from "$lib/components/ui/button/button.svelte";
	import AsyncButton from "$lib/components/ui/AsyncButton.svelte";
	import LoadingSection from "$lib/components/ui/LoadingSection.svelte";
	import ErrorSection from "$lib/components/ui/ErrorSection.svelte";
	import BulkActionToolbar from "$lib/components/ui/BulkActionToolbar.svelte";
	import { handleDelete } from "$lib/hooks/handleDelete.svelte";
	import EmptyState from "$lib/components/ui/EmptyState.svelte";
	import { Calendar, MapPin, Earth } from "@lucide/svelte";

	let itemsPromise = $state<Promise<Event[]>>(listEvents());
	let resolvedItems = $state<Event[]>([]);
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
	function selectAll(items: Event[]) {
		selectedIds = new Set(items.map((item) => item.id));
	}
	function deselectAll() {
		selectedIds = new Set();
	}

	function formatEventTime(event: Event): string {
		// Check if this is an all-day event (has startDate but no startDateTime)
		const isAllDay = event.startDate && !event.startDateTime;

		if (isAllDay) {
			if (event.endDate && event.endDate !== event.startDate) {
				return `All day: ${event.startDate} - ${event.endDate}`;
			}
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

	// Track when items are resolved and setup SSE for real-time updates
	let abortController: AbortController | null = null;
	let sseSetupAttempted = false;

	async function setupSSEWithFetch() {
		console.log("[SSE Client] Attempting to connect with fetch...");

		abortController = new AbortController();

		try {
			const response = await fetch("/api/events/sse", {
				credentials: "include", // This ensures cookies are sent
				signal: abortController.signal,
				headers: {
					Accept: "text/event-stream",
				},
			});

			console.log("[SSE Client] Response status:", response.status);

			if (!response.ok) {
				console.error(
					"[SSE Client] Failed with status:",
					response.status,
				);
				return;
			}

			if (!response.body) {
				console.error("[SSE Client] No response body");
				return;
			}

			console.log("[SSE Client] Connection opened successfully");

			const reader = response.body.getReader();
			const decoder = new TextDecoder();
			let buffer = "";

			while (true) {
				const { done, value } = await reader.read();

				if (done) {
					console.log("[SSE Client] Stream closed");
					break;
				}

				buffer += decoder.decode(value, { stream: true });

				// Process complete SSE messages
				const lines = buffer.split("\n\n");
				buffer = lines.pop() || ""; // Keep incomplete message in buffer

				for (const message of lines) {
					if (message.startsWith(":")) continue; // Ignore heartbeats

					const eventMatch = message.match(/^event: (.+)$/m);
					const dataMatch = message.match(/^data: (.+)$/m);

					if (eventMatch && dataMatch) {
						const eventType = eventMatch[1];
						console.log("[SSE Client] Received event:", eventType);

						if (
							[
								"event-created",
								"event-updated",
								"event-deleted",
							].includes(eventType)
						) {
							itemsPromise = listEvents();
						}
					}
				}
			}
		} catch (error: unknown) {
			if (error instanceof Error && error.name === "AbortError") {
				console.log("[SSE Client] Connection aborted");
			} else if (
				error instanceof TypeError &&
				error.message.includes("input stream")
			) {
				// This happens during HMR reloads - ignore silently
				console.log(
					"[SSE Client] Stream interrupted (likely HMR reload)",
				);
			} else {
				console.error("[SSE Client] Error:", error);
			}
		}
	}

	$effect(() => {
		itemsPromise
			.then((items) => {
				resolvedItems = items;

				// Try to setup SSE once after items are loaded
				if (!sseSetupAttempted) {
					sseSetupAttempted = true;
					setupSSEWithFetch();
				}
			})
			.catch(() => {
				// Error handling is done in the {#await} block
			});

		return () => {
			if (abortController) {
				console.log("[SSE Client] Cleaning up connection");
				abortController.abort();
				abortController = null;
			}
		};
	});
</script>

<div class="container mx-auto px-4 py-8">
	<div class="max-w-4xl mx-auto">
		<Breadcrumb feature="events" />
		<div class="bg-white shadow rounded-lg p-6">
			<div
				class="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4"
			>
				<h1 class="text-3xl font-bold flex-shrink-0">
					Calendar Events
				</h1>
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
													class="text-xl font-semibold break-words"
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
											<div
												class="flex items-center gap-2"
											>
												<Calendar
													size={14}
													class="text-blue-500"
												/>
												<span
													class="text-xs text-gray-500"
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
														class="text-xs text-gray-400 truncate min-w-0"
														>{event.location}</span
													>
												</div>
											{/if}
											{#if event.isPublic}
												<div
													class="flex items-center gap-2"
												>
													<Earth
														size={14}
														class="text-green-500"
													/>

													<span
														class="text-xs text-green-600 font-medium"
														>Public</span
													>
												</div>
											{/if}
										</div>
									</div>
									<div class="flex flex-col gap-2 shrink-0">
										<Button
											href={`/events/${event.id}?edit=true`}
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
