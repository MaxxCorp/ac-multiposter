<script lang="ts">
    import { createLocation } from "./create.remote";
    import Breadcrumb from "$lib/components/ui/Breadcrumb.svelte";
    import { createLocationSchema } from "$lib/validations/locations";
    import LocationForm from "$lib/components/locations/LocationForm.svelte";
</script>

<div class="container mx-auto px-4 py-8">
    <div class="max-w-2xl mx-auto">
        <Breadcrumb feature="locations" current="New Location" />

        <div class="bg-white shadow rounded-lg p-6 space-y-4">
            <h1 class="text-3xl font-bold mb-6">Create New Location</h1>

            <LocationForm
                remoteFunction={createLocation}
                validationSchema={createLocationSchema}
                isUpdating={false}
            />
        </div>
    </div>
</div>
