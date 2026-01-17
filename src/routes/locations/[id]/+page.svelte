<script lang="ts">
    import { page } from "$app/state";
    import { goto } from "$app/navigation";
    import { readLocation } from "./read.remote";
    import { updateLocation } from "./update.remote";
    import { deleteLocation } from "./delete.remote";
    import Breadcrumb from "$lib/components/ui/Breadcrumb.svelte";
    import AsyncButton from "$lib/components/ui/AsyncButton.svelte";
    import ErrorSection from "$lib/components/ui/ErrorSection.svelte";
    import LoadingSection from "$lib/components/ui/LoadingSection.svelte";
    import { toast } from "svelte-sonner";
    import { updateLocationSchema } from "$lib/validations/locations";
    import { Button } from "$lib/components/ui/button";
    import { handleDelete } from "$lib/hooks/handleDelete.svelte";
    import ContactManager from "$lib/components/contacts/ContactManager.svelte";
    import LocationForm from "$lib/components/locations/LocationForm.svelte";
</script>

<div class="container mx-auto px-4 py-8">
    {#await readLocation(page.params.id || "")}
        <LoadingSection message="Loading location..." />
    {:then location}
        {#if location}
            <div class="max-w-2xl mx-auto">
                <Breadcrumb feature="locations" current={location.name} />
                <div class="bg-white shadow rounded-lg p-6 space-y-4">
                    <div class="flex justify-between items-start mb-6">
                        <div>
                            <h1 class="text-3xl font-bold mb-2">
                                {location.name}
                            </h1>
                            <p class="text-sm text-gray-500">
                                Created: {new Date(
                                    location.createdAt,
                                ).toLocaleString()}
                                {#if location.updatedAt !== location.createdAt}
                                    • Updated: {new Date(
                                        location.updatedAt,
                                    ).toLocaleString()}
                                {/if}
                            </p>
                        </div>
                        <div class="flex gap-2">
                            <AsyncButton
                                type="button"
                                loadingLabel="Deleting..."
                                loading={deleteLocation.pending}
                                variant="destructive"
                                onclick={async () => {
                                    await handleDelete({
                                        ids: [location.id],
                                        deleteFn: deleteLocation,
                                        itemName: "location",
                                    });
                                    goto("/locations");
                                }}
                            >
                                Delete
                            </AsyncButton>
                        </div>
                    </div>
                    <h2 class="text-xl font-semibold mb-4">Edit Location</h2>
                    <LocationForm
                        remoteFunction={updateLocation}
                        validationSchema={updateLocationSchema}
                        isUpdating={true}
                        initialData={location}
                    />
                </div>
            </div>
        {:else}
            <ErrorSection
                headline="Location Not Found"
                message="The location you are looking for does not exist."
                href="/locations"
                button="Back to Locations"
            />
        {/if}
    {:catch error}
        <ErrorSection
            headline="Error"
            message={error instanceof Error
                ? error.message
                : "Failed to load location"}
            href="/locations"
            button="Back to Locations"
        />
    {/await}
</div>
