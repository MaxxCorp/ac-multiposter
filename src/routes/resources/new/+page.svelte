<script lang="ts">
    import { goto } from "$app/navigation";
    import { createResource } from "./create.remote";
    import { listLocations } from "../../locations/list.remote";
    import { listResources } from "../list.remote";
    import Breadcrumb from "$lib/components/ui/Breadcrumb.svelte";
    import {
        createResourceSchema,
        type AllocationCalendar,
    } from "$lib/validations/resources";
    import AsyncButton from "$lib/components/ui/AsyncButton.svelte";
    import { toast } from "svelte-sonner";
    import { Button } from "$lib/components/ui/button";

    let locationsPromise = listLocations();
    let resourcesPromise = listResources();
    // Toggle to opt-in to parenting
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
</script>

<div class="container mx-auto px-4 py-8">
    <div class="max-w-2xl mx-auto">
        <Breadcrumb feature="resources" current="New Resource" />

        <div class="bg-white shadow rounded-lg p-6 space-y-4">
            <h1 class="text-3xl font-bold mb-6">Create New Resource</h1>

            <form
                class="space-y-4"
                {...createResource
                    .preflight(createResourceSchema as any)
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
                            await goto("/resources");
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
                        {...createResource.fields.name.as("text")}
                        class="mt-2 w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 {(createResource.fields.name.issues()
                            ?.length ?? 0) > 0
                            ? 'border-red-500'
                            : 'border-gray-300'}"
                        placeholder="Enter resource name"
                        onblur={() => createResource.validate()}
                    />
                    {#each createResource.fields.name.issues() ?? [] as issue}
                        <p class="mt-1 text-sm text-red-600">{issue.message}</p>
                    {/each}
                </label>

                <label class="block">
                    <span class="text-sm font-medium text-gray-700 mb-2"
                        >Type</span
                    >
                    <input
                        {...createResource.fields.type.as("text")}
                        class="mt-2 w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 {(createResource.fields.type.issues()
                            ?.length ?? 0) > 0
                            ? 'border-red-500'
                            : 'border-gray-300'}"
                        placeholder="e.g. room, equipment, vehicle"
                        onblur={() => createResource.validate()}
                    />
                    {#each createResource.fields.type.issues() ?? [] as issue}
                        <p class="mt-1 text-sm text-red-600">{issue.message}</p>
                    {/each}
                </label>

                <label class="block">
                    <span class="text-sm font-medium text-gray-700 mb-2"
                        >Description</span
                    >
                    <textarea
                        {...createResource.fields.description.as("text")}
                        rows="3"
                        class="mt-2 w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Enter description"
                    ></textarea>
                </label>

                <label class="block">
                    <span class="text-sm font-medium text-gray-700 mb-2"
                        >Max Occupancy</span
                    >
                    <input
                        {...createResource.fields.maxOccupancy.as("number")}
                        class="mt-2 w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Enter max occupancy"
                    />
                </label>

                {#await locationsPromise then locations}
                    <label class="block">
                        <span class="text-sm font-medium text-gray-700 mb-2"
                            >Location (Optional)</span
                        >
                        <select
                            {...createResource.fields.locationId.as("select")}
                            class="mt-2 w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                            <option value="">-- Select a location --</option>
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
                        <span class="text-sm font-medium text-gray-700 mb-2"
                            >Parent Resources (Optional)</span
                        >
                        <div class="mt-2 space-y-2">
                            <label class="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    checked={hasParent}
                                    onclick={() => (hasParent = !hasParent)}
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
                                    {#each resources as resource}
                                        <label class="flex items-center gap-2">
                                            <input
                                                {...createResource.fields.parentResourceIds.as(
                                                    "checkbox",
                                                    resource.id,
                                                )}
                                                class="w-4 h-4 text-blue-600"
                                            />
                                            <span class="text-sm"
                                                >{resource.name} ({resource.type})</span
                                            >
                                        </label>
                                    {/each}
                                    {#if resources.length === 0}
                                        <p class="text-sm text-gray-500">
                                            No resources available
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
                        Track resource allocation via synced calendars from
                        different providers
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
                                            removeAllocationCalendar(index)}
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
                        loadingLabel="Creating..."
                        loading={createResource.pending}
                    >
                        Create Resource
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
</div>
