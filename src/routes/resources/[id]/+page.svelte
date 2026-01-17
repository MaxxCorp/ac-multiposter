<script lang="ts">
    import { page } from "$app/state";
    import { readResource } from "./read.remote";
    import { listLocations } from "../../locations/list.remote";
    import { listResources } from "../list.remote";
    import Breadcrumb from "$lib/components/ui/Breadcrumb.svelte";
    import ErrorSection from "$lib/components/ui/ErrorSection.svelte";
    import LoadingSection from "$lib/components/ui/LoadingSection.svelte";
    import ResourceForm from "$lib/components/resources/ResourceForm.svelte";
    import { updateResource } from "./update.remote";
    import { updateResourceSchema } from "$lib/validations/resources";

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
                <div class="bg-white shadow rounded-lg p-6 space-y-4">
                    <h1 class="text-3xl font-bold mb-6">Edit Resource</h1>
                    <ResourceForm
                        remoteFunction={updateResource}
                        validationSchema={updateResourceSchema}
                        isUpdating={true}
                        initialData={resource}
                        {locations}
                        {allResources}
                    />
                </div>
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
