<script lang="ts">
    import { createResource } from "./create.remote";
    import { listLocations } from "../../locations/list.remote";
    import { listResources } from "../list.remote";
    import Breadcrumb from "$lib/components/ui/Breadcrumb.svelte";
    import { createResourceSchema } from "$lib/validations/resources";
    import ResourceForm from "$lib/components/resources/ResourceForm.svelte";

    let locationsPromise = listLocations();
    let resourcesPromise = listResources();
</script>

<div class="container mx-auto px-4 py-8">
    <div class="max-w-2xl mx-auto">
        <Breadcrumb feature="resources" current="New Resource" />

        <div class="bg-white shadow rounded-lg p-6 space-y-4">
            <h1 class="text-3xl font-bold mb-6">Create New Resource</h1>

            {#await Promise.all([locationsPromise, resourcesPromise])}
                <p>Loading...</p>
            {:then [locations, allResources]}
                <ResourceForm
                    remoteFunction={createResource}
                    validationSchema={createResourceSchema}
                    {locations}
                    {allResources}
                />
            {/await}
        </div>
    </div>
</div>
