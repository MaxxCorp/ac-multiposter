<script lang="ts">
    import AsyncButton from "$lib/components/ui/AsyncButton.svelte";
    import { toast } from "svelte-sonner";
    import { Button } from "$lib/components/ui/button";
    import { goto } from "$app/navigation";
    import type { createResource } from "../../../routes/resources/new/create.remote";
    import type { updateResource } from "../../../routes/resources/[id]/update.remote";
    import { type AllocationCalendar } from "$lib/validations/resources";
    import ContactManager from "$lib/components/contacts/ContactManager.svelte";

    let {
        remoteFunction,
        validationSchema,
        isUpdating = false,
        initialData = null,
        locations = [],
        allResources = [],
    }: {
        remoteFunction: typeof updateResource | typeof createResource;
        validationSchema: any;
        isUpdating?: boolean;
        initialData?: any;
        locations: any[];
        allResources: any[];
    } = $props();

    function getField(name: string) {
        if (!(remoteFunction as any).fields) return {};
        const parts = name.split(".");
        let current = (remoteFunction as any).fields;
        for (const part of parts) {
            if (!current) return {};
            current = current[part];
        }
        return current || {};
    }

    // Allocation calendars management
    let allocationCalendars = $state<AllocationCalendar[]>(
        initialData?.allocationCalendars || [],
    );
    let newProvider = $state("google-calendar");
    let newCalendarId = $state("");

    // Initialize allocationCalendars from initialData if present
    $effect(() => {
        if (initialData?.allocationCalendars) {
            allocationCalendars = initialData.allocationCalendars;
        }
    });

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

    // Parent resources logic
    // Initial parents are derived from initialData.parentResourceIds or similar relations
    // But wait, the create form logic for "hasParent" was client-side only state.
    // For update, we need to know existing parents.
    // Assuming initialData has `parentResourceIds` which is array of strings.
    let hasParent = $state((initialData?.parentResourceIds?.length || 0) > 0);
</script>

<form
    class="space-y-4"
    {...remoteFunction
        .preflight(validationSchema)
        .enhance(async ({ submit }) => {
            try {
                const result: any = await submit();
                if (result?.error) {
                    toast.error(
                        result.error.message || "Oh no! Something went wrong",
                    );
                    return;
                }
                toast.success("Successfully Saved!");
                await goto("/resources");
            } catch (error: unknown) {
                const err = error as { message?: string };
                toast.error(err?.message || "Oh no! Something went wrong");
            }
        })}
>
    {#if isUpdating && initialData}
        <input {...getField("id").as("hidden", initialData.id)} />
    {/if}

    <label class="block">
        <span class="text-sm font-medium text-gray-700 mb-2">Name</span>
        <input
            {...getField("name").as("text")}
            class="mt-2 w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 {(getField(
                'name',
            ).issues()?.length ?? 0) > 0
                ? 'border-red-500'
                : 'border-gray-300'}"
            placeholder="Enter resource name"
            onblur={() => remoteFunction.validate()}
            value={initialData?.name ?? ""}
        />
        {#each getField("name").issues() ?? [] as issue}
            <p class="mt-1 text-sm text-red-600">{issue.message}</p>
        {/each}
    </label>

    <label class="block">
        <span class="text-sm font-medium text-gray-700 mb-2">Type</span>
        <input
            {...getField("type").as("text")}
            class="mt-2 w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 {(getField(
                'type',
            ).issues()?.length ?? 0) > 0
                ? 'border-red-500'
                : 'border-gray-300'}"
            placeholder="e.g. room, equipment, vehicle"
            onblur={() => remoteFunction.validate()}
            value={initialData?.type ?? ""}
        />
        {#each getField("type").issues() ?? [] as issue}
            <p class="mt-1 text-sm text-red-600">{issue.message}</p>
        {/each}
    </label>

    <label class="block">
        <span class="text-sm font-medium text-gray-700 mb-2">Description</span>
        <textarea
            {...getField("description").as("text")}
            rows="3"
            class="mt-2 w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Enter description"
            value={initialData?.description ?? ""}
        ></textarea>
    </label>

    <label class="block">
        <span class="text-sm font-medium text-gray-700 mb-2">Max Occupancy</span
        >
        <input
            {...getField("maxOccupancy").as("number")}
            class="mt-2 w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Enter max occupancy"
            value={initialData?.maxOccupancy ?? ""}
        />
    </label>

    <label class="block">
        <span class="text-sm font-medium text-gray-700 mb-2"
            >Location (Optional)</span
        >
        <select
            {...getField("locationId").as("select")}
            class="mt-2 w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            value={initialData?.locationId ?? ""}
        >
            <option value="">-- Select a location --</option>
            {#each locations as location}
                <option value={location.id}>{location.name}</option>
            {/each}
        </select>
    </label>

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
                <span class="text-sm">Assign to existing parent(s)</span>
            </label>
            {#if hasParent}
                <div
                    class="space-y-2 border rounded-md p-4 max-h-48 overflow-y-auto"
                >
                    {#each allResources as resource}
                        {#if !isUpdating || resource.id !== initialData?.id}
                            <!-- Prevent self-parenting -->
                            <label class="flex items-center gap-2">
                                <input
                                    {...getField("parentResourceIds").as(
                                        "checkbox",
                                        resource.id,
                                    )}
                                    class="w-4 h-4 text-blue-600"
                                    checked={initialData?.parentResourceIds?.includes(
                                        resource.id,
                                    ) ?? false}
                                />
                                <span class="text-sm"
                                    >{resource.name} ({resource.type})</span
                                >
                            </label>
                        {/if}
                    {/each}
                    {#if allResources.length === 0}
                        <p class="text-sm text-gray-500">
                            No resources available
                        </p>
                    {/if}
                </div>
            {/if}
        </div>
    </label>

    <div class="block">
        <span class="text-sm font-medium text-gray-700 mb-2"
            >Allocation Calendars (Optional)</span
        >
        <p class="text-xs text-gray-500 mb-3">
            Track resource allocation via synced calendars from different
            providers
        </p>

        {#if allocationCalendars.length > 0}
            <div class="space-y-2 mb-3">
                {#each allocationCalendars as calendar, index}
                    <div
                        class="flex items-center gap-2 p-2 bg-gray-50 rounded border"
                    >
                        <span class="text-sm flex-1">
                            <span class="font-medium">{calendar.provider}:</span
                            >
                            {calendar.calendarId}
                        </span>
                        <button
                            type="button"
                            onclick={() => removeAllocationCalendar(index)}
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
                <option value="google-calendar">Google Calendar</option>
                <option value="microsoft-calendar">Microsoft Calendar</option>
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

        <input
            {...getField("allocationCalendars").as(
                "hidden",
                JSON.stringify(allocationCalendars),
            )}
        />
    </div>

    {#if isUpdating && initialData?.id}
        <ContactManager type="resource" entityId={initialData.id} />
    {/if}

    <div class="flex gap-3 mt-6">
        <AsyncButton
            type="submit"
            loadingLabel={isUpdating ? "Saving..." : "Creating..."}
            loading={remoteFunction.pending}
        >
            {isUpdating ? "Save Changes" : "Create Resource"}
        </AsyncButton>
        <Button variant="secondary" href="/resources" size="default">
            Cancel
        </Button>
    </div>
</form>
