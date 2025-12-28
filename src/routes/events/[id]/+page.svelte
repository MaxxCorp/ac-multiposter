<script lang="ts">
	import { page } from "$app/state";
	import { readEvent } from "./read.remote";
	import { listResourcesWithHierarchy } from "../../resources/list-with-hierarchy.remote";
	import { listLocations } from "../../locations/list.remote";
	import Breadcrumb from "$lib/components/ui/Breadcrumb.svelte";
	import ErrorSection from "$lib/components/ui/ErrorSection.svelte";
	import LoadingSection from "$lib/components/ui/LoadingSection.svelte";
	import EventEditForm from "./EventEditForm.svelte";
	import EventView from "$lib/components/events/EventView.svelte";

	const eventId = page.params.id || "";

	const dataPromise = Promise.all([
		readEvent(eventId),
		listResourcesWithHierarchy(),
		listLocations(),
	]);

	let mode = $state<"view" | "edit">(
		page.url.searchParams.get("edit") === "true" ? "edit" : "view",
	);

	// Check if the user is authorized to edit
	function checkCanEdit(event: any) {
		const user = page.data.user as any;
		return (
			!!user &&
			(user.id === event.userId || (user.roles || []).includes("admin"))
		);
	}
</script>

<div class="container mx-auto px-4 py-8">
	<div class="max-w-4xl mx-auto">
		{#await dataPromise}
			<LoadingSection message="Loading event data..." />
		{:then [event, resources, locations]}
			{#if event}
				<Breadcrumb feature="events" current={event.summary} />

				<div
					class="bg-white shadow-xl rounded-2xl p-8 border border-gray-100"
				>
					{#if mode === "view"}
						<EventView
							{event}
							canEdit={checkCanEdit(event)}
							onedit={() => (mode = "edit")}
						/>
					{:else}
						<div class="flex justify-between items-center mb-6">
							<h1 class="text-2xl font-bold">Edit Event</h1>
							<button
								class="text-sm text-gray-500 hover:text-gray-700 underline"
								onclick={() => (mode = "view")}
							>
								Cancel Edit
							</button>
						</div>
						<EventEditForm {event} {resources} {locations} />
					{/if}
				</div>
			{:else}
				<ErrorSection
					headline="Event Not Found"
					message="The event you are looking for does not exist."
					href="/events"
					button="Back to Events"
				/>
			{/if}
		{:catch error}
			<ErrorSection
				headline="Error"
				message={error instanceof Error
					? error.message
					: "Failed to load event data"}
				href="/events"
				button="Back to Events"
			/>
		{/await}
	</div>
</div>
