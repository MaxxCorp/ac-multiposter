<script lang="ts">
    import { page } from "$app/state";
    import { readResource } from "./read.remote";
    import { listLocations } from "../../locations/list.remote";
    import { listResources } from "../list.remote";
    import Breadcrumb from "$lib/components/ui/Breadcrumb.svelte";
    import ErrorSection from "$lib/components/ui/ErrorSection.svelte";
    import LoadingSection from "$lib/components/ui/LoadingSection.svelte";
    import ResourceEditForm from "./ResourceEditForm.svelte";

    const resourceId = page.params.id || "";

    const dataPromise = Promise.all([
        readResource(resourceId),
        listLocations(),
        listResources(),
    ]);
</script>

<div class="container mx-auto px-4 py-8">
    {#await dataPromise}
        <LoadingSection message="Loading resource..." />
    {:then [resource, locations, allResources]}
        {#if resource}
            <div class="max-w-2xl mx-auto">
                <Breadcrumb feature="resources" current={resource.name} />
                <ResourceEditForm {resource} {locations} {allResources} />
            </div>
        {:else}
            <ErrorSection
                headline="Resource Not Found"
                message="The resource you are looking for does not exist."
                href="/resources"
                button="Back to Resources"
            />
        {/if}
    {:catch error}
        <ErrorSection
            headline="Error"
            message={error instanceof Error
                ? error.message
                : "Failed to load resource"}
            href="/resources"
            button="Back to Resources"
        />
    {/await}
</div>
