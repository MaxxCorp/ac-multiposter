<script lang="ts">
	import { page } from "$app/state";
	import { readEvent } from "./read.remote";
	import { updateExistingEvent } from "./update.remote";
	import { updateEventSchema } from "$lib/validations/events";
	import EventForm from "$lib/components/events/EventForm.svelte";
	import LoadingSection from "$lib/components/ui/LoadingSection.svelte";
	import ErrorSection from "$lib/components/ui/ErrorSection.svelte";
</script>

{#await readEvent(page.params.id ?? "")}
	<LoadingSection message="Loading event data..." />
{:then event}
	{#if event}
		<EventForm
			remoteFunction={updateExistingEvent}
			validationSchema={updateEventSchema}
			isUpdating={true}
			initialData={event}
		/>
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
