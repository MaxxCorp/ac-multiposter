<script lang="ts">
	import { createNewEvent } from "./create.remote";
	import { createEventSchema } from "$lib/validations/events";
	import EventForm from "$lib/components/events/EventForm.svelte";
</script>

<EventForm
	remoteFunction={createNewEvent}
	validationSchema={createEventSchema}
/>
