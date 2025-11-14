<script lang="ts">
	import { listEvents } from './list.remote';
	import { deleteEvents } from './[id]/delete.remote';
	import type { Event } from './list.remote';
	import Breadcrumb from '$lib/components/ui/Breadcrumb.svelte';
	import ListCard from '$lib/components/ui/ListCard.svelte';
	import BulkActionToolbar from '$lib/components/ui/BulkActionToolbar.svelte';
	import EmptyState from '$lib/components/ui/EmptyState.svelte';
	import Spinner from '$lib/components/ui/Spinner.svelte';
	import { createMultiSelect } from '$lib/hooks/multiSelect.svelte';
	import { toast } from '$lib/stores/toast.svelte';
	import { Calendar, Plus } from '@lucide/svelte';

	// Multi-select state
	const selection = createMultiSelect<Event>();
	
	// Create a single promise for the events list
	let eventsPromise = $state(listEvents());

	async function handleBulkDelete() {
		if (selection.count === 0) return;
		const count = selection.count;
		if (!confirm(`Delete ${count} event(s)?`)) return;

		try {
			await deleteEvents(selection.getSelectedArray()).updates(listEvents());
			toast.success(`${count} event(s) deleted successfully!`);
			selection.deselectAll();
			eventsPromise = listEvents(); // Refresh the list
		} catch (error: any) {
			toast.error(error.message || 'Failed to delete events');
		}
	}

	function formatEventTime(event: Event): string {
		// Handle all-day events
		if (event.startDate) {
			return `All day on ${event.startDate}`;
		}
		
		// Handle timed events
		if (event.startDateTime) {
			const start = new Date(event.startDateTime);
			const end = event.endDateTime ? new Date(event.endDateTime) : null;
			const dateStr = start.toLocaleDateString();
			const startTime = start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
			
			if (end) {
				const endTime = end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
				return `${dateStr}, ${startTime} - ${endTime}`;
			}
			
			return `${dateStr}, ${startTime}`;
		}
		
		return 'Time not specified';
	}
</script>

<div class="container mx-auto px-4 py-8">
	<Breadcrumb feature="events" />

	{#await eventsPromise}
		<div class="flex justify-between items-center mb-6">
			<h1 class="text-3xl font-bold">Calendar Events</h1>
		</div>
		<Spinner message="Loading events..." />
	{:then events}
		<div class="flex justify-between items-center mb-6">
			<h1 class="text-3xl font-bold">Calendar Events</h1>
			<BulkActionToolbar
				selectedCount={selection.count}
				totalCount={events.length}
				onSelectAll={() => selection.selectAll(events)}
				onDeselectAll={() => selection.deselectAll()}
				onDelete={handleBulkDelete}
				newItemHref="/events/new"
				newItemLabel="+ New Event"
			/>
		</div>

		<div class="grid gap-4">
			{#if events.length === 0}
				<EmptyState
					icon={Calendar}
					title="No Events"
					description="Get started by creating your first calendar event"
					actionLabel="Create Your First Event"
					actionHref="/events/new"
				/>
			{:else}
				{#each events as event (event.id)}
					<ListCard
						id={event.id}
						href={`/events/${event.id}`}
						selected={selection.isSelected(event.id)}
						onToggle={selection.toggleSelection}
						subtitle={formatEventTime(event)}
						editHref={`/events/${event.id}?edit=1`}
						onDelete={async (id) => {
							await deleteEvents([id]).updates(listEvents());
							toast.success('Event deleted successfully!');
							eventsPromise = listEvents(); // Refresh the list
						}}
						deleteLabel="Delete"
						cardNavigationEnabled={false}
					>
						{#snippet title()}
							<a 
								href={`/events/${event.id}`} 
								class="hover:underline text-blue-600"
								onclick={(e) => e.stopPropagation()}
							>
								{event.summary}
							</a>
						{/snippet}

						{#snippet badge()}
							{#if event.colorId}
								<div
									class="w-4 h-4 rounded-full"
									style="background-color: hsl({parseInt(event.colorId) * 30}, 70%, 60%)"
								></div>
							{/if}
						{/snippet}

						{#snippet content()}
							{#if event.location}
								<p class="text-sm text-gray-600 mb-2">
									📍 {event.location}
								</p>
							{/if}
							
							{#if event.description}
								<p class="text-gray-700 mb-2 line-clamp-2">{event.description}</p>
							{/if}
						{/snippet}

						{#snippet metadata()}
							<div class="flex gap-2 flex-wrap">
								<span class="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">
									{event.eventType}
								</span>
								<span class="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">
									{event.status}
								</span>
								{#if event.attendees && event.attendees.length > 0}
									<span class="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded">
										{event.attendees.length} attendee{event.attendees.length > 1 ? 's' : ''}
									</span>
								{/if}
								{#if event.recurrence}
									<span class="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded">
										Recurring
									</span>
								{/if}
							</div>
							
							<p class="text-xs text-gray-500 mt-3">
								Created: {new Date(event.createdAt).toLocaleString()}
							</p>
						{/snippet}
					</ListCard>
				{/each}
			{/if}
		</div>
	{:catch error}
		<div class="text-center py-12">
			<p class="text-red-600 mb-3">{error?.message || 'Failed to load events'}</p>
			<button 
				onclick={() => eventsPromise = listEvents()}
				class="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
			>
				Retry
			</button>
		</div>
	{/await}
</div>
