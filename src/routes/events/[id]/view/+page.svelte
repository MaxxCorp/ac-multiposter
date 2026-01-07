<script lang="ts">
    import { page } from "$app/state";
    import { readEvent } from "../read.remote";
    import EventView from "$lib/components/events/EventView.svelte";
    import Breadcrumb from "$lib/components/ui/Breadcrumb.svelte";
    import ErrorSection from "$lib/components/ui/ErrorSection.svelte";
    import LoadingSection from "$lib/components/ui/LoadingSection.svelte";
    import { goto } from "$app/navigation";

    const eventId = page.params.id || "";
    let dataPromise = $state(readEvent(eventId));

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
        {:then event}
            {#if event}
                <Breadcrumb feature="events" current={event.summary} />

                <div
                    class="bg-white shadow-xl rounded-2xl p-8 border border-gray-100"
                >
                    <EventView
                        {event}
                        canEdit={checkCanEdit(event)}
                        onedit={() => goto(`/events/${event.id}`)}
                    />
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
