<script lang="ts">
    import { goto } from "$app/navigation";
    import { createLocation } from "./create.remote";
    import Breadcrumb from "$lib/components/ui/Breadcrumb.svelte";
    import { createLocationSchema } from "$lib/validations/location";
    import AsyncButton from "$lib/components/ui/AsyncButton.svelte";
    import { toast } from "svelte-sonner";
    import { Button } from "$lib/components/ui/button";
</script>

<div class="container mx-auto px-4 py-8">
    <div class="max-w-2xl mx-auto">
        <Breadcrumb feature="locations" current="New Location" />

        <div class="bg-white shadow rounded-lg p-6 space-y-4">
            <h1 class="text-3xl font-bold mb-6">Create New Location</h1>

            <form
                class="space-y-4"
                {...createLocation
                    .preflight(createLocationSchema)
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
                            toast.success("Successfully Saved!");
                            await goto("/locations");
                        } catch (error: unknown) {
                            const err = error as { message?: string };
                            toast.error(
                                err?.message || "Oh no! Something went wrong",
                            );
                        }
                    })}
            >
                <label class="block">
                    <span class="text-sm font-medium text-gray-700 mb-2"
                        >Name</span
                    >
                    <input
                        {...createLocation.fields.name.as("text")}
                        class="mt-2 w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 {(createLocation.fields.name.issues()
                            ?.length ?? 0) > 0
                            ? 'border-red-500'
                            : 'border-gray-300'}"
                        placeholder="Enter location name"
                        onblur={() => createLocation.validate()}
                    />
                    {#each createLocation.fields.name.issues() ?? [] as issue}
                        <p class="mt-1 text-sm text-red-600">{issue.message}</p>
                    {/each}
                </label>

                <label class="block">
                    <span class="text-sm font-medium text-gray-700 mb-2"
                        >Address</span
                    >
                    <input
                        {...createLocation.fields.address.as("text")}
                        class="mt-2 w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Enter address"
                    />
                </label>

                <label class="block">
                    <span class="text-sm font-medium text-gray-700 mb-2"
                        >Room ID</span
                    >
                    <input
                        {...createLocation.fields.roomId.as("text")}
                        class="mt-2 w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Enter room ID (e.g. 101)"
                    />
                </label>

                <div class="grid grid-cols-2 gap-4">
                    <label class="block">
                        <span class="text-sm font-medium text-gray-700 mb-2"
                            >Latitude</span
                        >
                        <input
                            {...createLocation.fields.latitude.as("number")}
                            type="number"
                            step="any"
                            class="mt-2 w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            placeholder="Latitude"
                        />
                    </label>
                    <label class="block">
                        <span class="text-sm font-medium text-gray-700 mb-2"
                            >Longitude</span
                        >
                        <input
                            {...createLocation.fields.longitude.as("number")}
                            type="number"
                            step="any"
                            class="mt-2 w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            placeholder="Longitude"
                        />
                    </label>
                </div>

                <label class="block">
                    <span class="text-sm font-medium text-gray-700 mb-2"
                        >what3words</span
                    >
                    <input
                        {...createLocation.fields.what3words.as("text")}
                        class="mt-2 w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="e.g. filled.count.soap"
                    />
                </label>

                <div class="flex gap-3 mt-6">
                    <AsyncButton
                        type="submit"
                        loadingLabel="Creating..."
                        loading={createLocation.pending}
                    >
                        Create Location
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
</div>
