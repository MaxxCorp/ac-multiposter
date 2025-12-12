<script lang="ts">
	import { page } from "$app/state";
	import { readEvent } from "./read.remote";
	import { listResourcesWithHierarchy } from "../../resources/list-with-hierarchy.remote";
	import { listLocations } from "../../locations/list.remote";
	import Breadcrumb from "$lib/components/ui/Breadcrumb.svelte";
	import ErrorSection from "$lib/components/ui/ErrorSection.svelte";
	import LoadingSection from "$lib/components/ui/LoadingSection.svelte";
	import EventEditForm from "./EventEditForm.svelte";

	const eventId = page.params.id || "";

	const dataPromise = Promise.all([
		readEvent(eventId),
		listResourcesWithHierarchy(),
		listLocations(),
	]);
</script>

<div class="container mx-auto px-4 py-8">
	<div class="max-w-4xl mx-auto">
		{#await dataPromise}
			<LoadingSection message="Loading event data..." />
		{:then [event, resources, locations]}
			{#if event}
				<Breadcrumb feature="events" current={event.summary} />
				<EventEditForm {event} {resources} {locations} />
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
