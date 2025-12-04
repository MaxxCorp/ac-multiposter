<script lang="ts">
    import { page } from "$app/state";
    import { goto } from "$app/navigation";
    import { readResource } from "./read.remote";
    import { updateResource } from "./update.remote";
    import { deleteResource } from "./delete.remote";
    import { listLocations } from "../../locations/list.remote";
    import { listResources } from "../list.remote";
    import Breadcrumb from "$lib/components/ui/Breadcrumb.svelte";
    import AsyncButton from "$lib/components/ui/AsyncButton.svelte";
    import ErrorSection from "$lib/components/ui/ErrorSection.svelte";
    import LoadingSection from "$lib/components/ui/LoadingSection.svelte";
    import { toast } from "svelte-sonner";
    import {
        updateResourceSchema,
        type AllocationCalendar,
    } from "$lib/validations/resource";
    import { Button } from "$lib/components/ui/button";
    import { handleDelete } from "$lib/hooks/handleDelete.svelte";

    let locationsPromise = listLocations();
    let resourcesPromise = listResources();
    let resourcePromise = readResource(page.params.id || "");
    // Toggle based on existing parent linkage
    let hasParent = $state(false);
    // Allocation calendars management
    let allocationCalendars = $state<AllocationCalendar[]>([]);
    let newProvider = $state("google-calendar");
    let newCalendarId = $state("");

    function addAllocationCalendar() {
        if (newCalendarId.trim()) {
            allocationCalendars = [
                ...allocationCalendars,
                { provider: newProvider, calendarId: newCalendarId.trim() },
            ];
            newCalendarId = "";
        }
    }

    function removeAllocationCalendar(index: number) {
        allocationCalendars = allocationCalendars.filter((_, i) => i !== index);
    }

    // Initialize hasParent and allocationCalendars when resource loads
    $effect(() => {
        resourcePromise.then((resource) => {
            if (
                resource &&
                resource.parentResourceIds &&
                resource.parentResourceIds.length > 0
            ) {
                hasParent = true;
                // Set the form field to the existing parent IDs
                updateResource.fields.parentResourceIds.set(
                    resource.parentResourceIds,
                );
            }
            if (
                resource &&
                resource.allocationCalendars &&
                Array.isArray(resource.allocationCalendars)
            ) {
                allocationCalendars =
                    resource.allocationCalendars as AllocationCalendar[];
            }
        });
    });
</script>

<div class="container mx-auto px-4 py-8">
    {#await resourcePromise}
        <LoadingSection message="Loading resource..." />
    {:then resource}
        {#if resource}
            <div class="max-w-2xl mx-auto">
                <Breadcrumb feature="resources" current={resource.name} />
                <div class="bg-white shadow rounded-lg p-6 space-y-4">
                    <div class="flex justify-between items-start mb-6">
                        <div>
                            <h1 class="text-3xl font-bold mb-2">
                                {resource.name}
                            </h1>
                            <p class="text-sm text-gray-500">
                                Created: {new Date(
                                    resource.createdAt,
                                ).toLocaleString()}
                                {#if resource.updatedAt !== resource.createdAt}
                                    • Updated: {new Date(
                                        resource.updatedAt,
                                    ).toLocaleString()}
                                {/if}
                            </p>
                        </div>
                        <div class="flex gap-2">
                            <AsyncButton
                                type="button"
                                loadingLabel="Deleting..."
                                loading={deleteResource.pending}
                                variant="destructive"
                                onclick={async () => {
                                    await handleDelete({
                                        ids: [resource.id],
                                        deleteFn: deleteResource,
                                        itemName: "resource",
                                    });
                                    goto("/resources");
                                }}
                            >
                                Delete
                            </AsyncButton>
                        </div>
                    </div>
                    <h2 class="text-xl font-semibold mb-4">Edit Resource</h2>
                    <form
                        {...updateResource
                            .preflight(updateResourceSchema)
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
                                    goto("/resources");
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
                            {...updateResource.fields.id.as(
                                "hidden",
                                resource.id,
                            )}
                        />

                        <label class="block">
                            <span class="text-sm font-medium text-gray-700 mb-2"
                                >Name</span
                            >
                            <input
                                {...updateResource.fields.name.as("text")}
                                class="mt-2 w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 {(updateResource.fields.name.issues()
                                    ?.length ?? 0) > 0
                                    ? 'border-red-500'
                                    : 'border-gray-300'}"
                                placeholder="Enter resource name"
                                value={updateResource.fields.name.value() ??
                                    resource.name}
                                onblur={() => updateResource.validate()}
                            />
                            {#each updateResource.fields.name.issues() ?? [] as issue}
                                <p class="mt-1 text-sm text-red-600">
                                    {issue.message}
                                </p>
                            {/each}
                        </label>

                        <label class="block">
                            <span class="text-sm font-medium text-gray-700 mb-2"
                                >Type</span
                            >
                            <input
                                {...updateResource.fields.type.as("text")}
                                class="mt-2 w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 {(updateResource.fields.type.issues()
                                    ?.length ?? 0) > 0
                                    ? 'border-red-500'
                                    : 'border-gray-300'}"
                                placeholder="e.g. room, equipment, vehicle"
                                value={updateResource.fields.type.value() ??
                                    resource.type}
                                onblur={() => updateResource.validate()}
                            />
                            {#each updateResource.fields.type.issues() ?? [] as issue}
                                <p class="mt-1 text-sm text-red-600">
                                    {issue.message}
                                </p>
                            {/each}
                        </label>

                        <label class="block">
                            <span class="text-sm font-medium text-gray-700 mb-2"
                                >Description</span
                            >
                            <textarea
                                {...updateResource.fields.description.as(
                                    "text",
                                )}
                                rows="3"
                                class="mt-2 w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                placeholder="Enter description"
                                value={updateResource.fields.description.value() ??
                                    resource.description ??
                                    ""}
                            ></textarea>
                        </label>

                        {#await locationsPromise then locations}
                            <label class="block">
                                <span
                                    class="text-sm font-medium text-gray-700 mb-2"
                                    >Location (Optional)</span
                                >
                                <select
                                    {...updateResource.fields.locationId.as(
                                        "text",
                                    )}
                                    class="mt-2 w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    value={updateResource.fields.locationId.value() ??
                                        resource.locationId ??
                                        ""}
                                >
                                    <option value=""
                                        >-- Select a location --</option
                                    >
                                    {#each locations as location}
                                        <option value={location.id}
                                            >{location.name}</option
                                        >
                                    {/each}
                                </select>
                            </label>
                        {/await}

                        {#await resourcesPromise then resources}
                            <label class="block">
                                <span
                                    class="text-sm font-medium text-gray-700 mb-2"
                                    >Parent Resources (Optional)</span
                                >
                                <div class="mt-2 space-y-2">
                                    <label class="flex items-center gap-2">
                                        <input
                                            type="checkbox"
                                            checked={hasParent}
                                            onclick={() =>
                                                (hasParent = !hasParent)}
                                            class="w-4 h-4 text-blue-600"
                                        />
                                        <span class="text-sm"
                                            >Assign to existing parent(s)</span
                                        >
                                    </label>
                                    {#if hasParent}
                                        <div
                                            class="space-y-2 border rounded-md p-4 max-h-48 overflow-y-auto"
                                        >
                                            {#each resources.filter((r) => r.id !== resource.id) as otherResource}
                                                <label
                                                    class="flex items-center gap-2"
                                                >
                                                    <input
                                                        {...updateResource.fields.parentResourceIds.as(
                                                            "checkbox",
                                                            otherResource.id,
                                                        )}
                                                        class="w-4 h-4 text-blue-600"
                                                    />
                                                    <span class="text-sm"
                                                        >{otherResource.name} ({otherResource.type})</span
                                                    >
                                                </label>
                                            {/each}
                                            {#if resources.filter((r) => r.id !== resource.id).length === 0}
                                                <p
                                                    class="text-sm text-gray-500"
                                                >
                                                    No other resources available
                                                </p>
                                            {/if}
                                        </div>
                                    {/if}
                                </div>
                            </label>
                        {/await}

                        <div class="block">
                            <span class="text-sm font-medium text-gray-700 mb-2"
                                >Allocation Calendars (Optional)</span
                            >
                            <p class="text-xs text-gray-500 mb-3">
                                Track resource allocation via synced calendars
                                from different providers
                            </p>

                            {#if allocationCalendars.length > 0}
                                <div class="space-y-2 mb-3">
                                    {#each allocationCalendars as calendar, index}
                                        <div
                                            class="flex items-center gap-2 p-2 bg-gray-50 rounded border"
                                        >
                                            <span class="text-sm flex-1">
                                                <span class="font-medium"
                                                    >{calendar.provider}:</span
                                                >
                                                {calendar.calendarId}
                                            </span>
                                            <button
                                                type="button"
                                                onclick={() =>
                                                    removeAllocationCalendar(
                                                        index,
                                                    )}
                                                class="text-red-600 hover:text-red-800 text-sm"
                                            >
                                                Remove
                                            </button>
                                        </div>
                                    {/each}
                                </div>
                            {/if}

                            <div class="flex gap-2">
                                <select
                                    bind:value={newProvider}
                                    class="px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                >
                                    <option value="google-calendar"
                                        >Google Calendar</option
                                    >
                                    <option value="microsoft-calendar"
                                        >Microsoft Calendar</option
                                    >
                                </select>
                                <input
                                    type="text"
                                    bind:value={newCalendarId}
                                    placeholder="Calendar ID"
                                    class="flex-1 px-4 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    onkeydown={(e) => {
                                        if (e.key === "Enter") {
                                            e.preventDefault();
                                            addAllocationCalendar();
                                        }
                                    }}
                                />
                                <button
                                    type="button"
                                    onclick={addAllocationCalendar}
                                    class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                                >
                                    Add
                                </button>
                            </div>

                            {#if allocationCalendars.length > 0}
                                <input
                                    type="hidden"
                                    name="allocationCalendars"
                                    value={JSON.stringify(allocationCalendars)}
                                />
                            {/if}
                        </div>

                        <div class="flex gap-3 mt-6">
                            <AsyncButton
                                type="submit"
                                loadingLabel="Saving..."
                                loading={updateResource.pending}
                            >
                                Save Changes
                            </AsyncButton>
                            <Button
                                variant="secondary"
                                href="/resources"
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
