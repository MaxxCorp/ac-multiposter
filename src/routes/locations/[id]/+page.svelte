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
    import { updateLocationSchema } from "$lib/validations/location";
    import { Button } from "$lib/components/ui/button";
    import { handleDelete } from "$lib/hooks/handleDelete.svelte";
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
                    <form
                        {...updateLocation
                            .preflight(updateLocationSchema)
                            .enhance(async ({ submit }) => {
                                try {
                                    const result: any = await submit();
                                    if (result?.error) {
                                        toast.error(
                                            result.error.message ||
                                                "Oh no! Something went wrong",
                                        );
                                        return;
                                    }
                                    toast.success("Successfully saved!");
                                    goto("/locations");
                                } catch (error: unknown) {
                                    const err = error as { message?: string };
                                    toast.error(
                                        err?.message ||
                                            "Oh no! Something went wrong",
                                    );
                                }
                            })}
                        class="space-y-4"
                    >
                        <input
                            {...updateLocation.fields.id.as(
                                "hidden",
                                location.id,
                            )}
                        />

                        <label class="block">
                            <span class="text-sm font-medium text-gray-700 mb-2"
                                >Name</span
                            >
                            <input
                                {...updateLocation.fields.name.as("text")}
                                class="mt-2 w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 {(updateLocation.fields.name.issues()
                                    ?.length ?? 0) > 0
                                    ? 'border-red-500'
                                    : 'border-gray-300'}"
                                placeholder="Enter location name"
                                value={updateLocation.fields.name.value() ??
                                    location.name}
                                onblur={() => updateLocation.validate()}
                            />
                            {#each updateLocation.fields.name.issues() ?? [] as issue}
                                <p class="mt-1 text-sm text-red-600">
                                    {issue.message}
                                </p>
                            {/each}
                        </label>

                        <label class="block">
                            <span class="text-sm font-medium text-gray-700 mb-2"
                                >Address</span
                            >
                            <input
                                {...updateLocation.fields.address.as("text")}
                                class="mt-2 w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                placeholder="Enter address"
                                value={updateLocation.fields.address.value() ??
                                    location.address ??
                                    ""}
                            />
                        </label>

                        <label class="block">
                            <span class="text-sm font-medium text-gray-700 mb-2"
                                >Room ID</span
                            >
                            <input
                                {...updateLocation.fields.roomId.as("text")}
                                class="mt-2 w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                placeholder="Enter room ID"
                                value={updateLocation.fields.roomId.value() ??
                                    location.roomId ??
                                    ""}
                            />
                        </label>

                        <div class="grid grid-cols-2 gap-4">
                            <label class="block">
                                <span
                                    class="text-sm font-medium text-gray-700 mb-2"
                                    >Latitude</span
                                >
                                <input
                                    {...updateLocation.fields.latitude.as(
                                        "number",
                                    )}
                                    type="number"
                                    step="any"
                                    class="mt-2 w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    placeholder="Latitude"
                                    value={updateLocation.fields.latitude.value() ??
                                        location.latitude ??
                                        ""}
                                />
                            </label>
                            <label class="block">
                                <span
                                    class="text-sm font-medium text-gray-700 mb-2"
                                    >Longitude</span
                                >
                                <input
                                    {...updateLocation.fields.longitude.as(
                                        "number",
                                    )}
                                    type="number"
                                    step="any"
                                    class="mt-2 w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    placeholder="Longitude"
                                    value={updateLocation.fields.longitude.value() ??
                                        location.longitude ??
                                        ""}
                                />
                            </label>
                        </div>

                        <label class="block">
                            <span class="text-sm font-medium text-gray-700 mb-2"
                                >what3words</span
                            >
                            <input
                                {...updateLocation.fields.what3words.as("text")}
                                class="mt-2 w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                placeholder="e.g. filled.count.soap"
                                value={updateLocation.fields.what3words.value() ??
                                    location.what3words ??
                                    ""}
                            />
                        </label>

                        <div class="flex gap-3 mt-6">
                            <AsyncButton
                                type="submit"
                                loadingLabel="Saving..."
                                loading={updateLocation.pending}
                            >
                                Save Changes
                            </AsyncButton>
                            <Button
                                variant="secondary"
                                href="/locations"
                                size="default"
                            >
                                Cancel
                            </Button>
                        </div>
                    </form>
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
