<script lang="ts">
    import { listLocations } from "../../../routes/locations/list.remote";
    import type { Location } from "../../../routes/locations/list.remote";
    import Button from "$lib/components/ui/button/button.svelte";
    import AsyncButton from "$lib/components/ui/AsyncButton.svelte";
    import LocationSelector from "$lib/components/locations/LocationSelector.svelte";
    import { onMount } from "svelte";
    import { toast } from "svelte-sonner";
    import { goto } from "$app/navigation";
    import type { createKiosk } from "../../../routes/kiosks/new/create.remote";
    import type { updateKiosk } from "../../../routes/kiosks/[id]/update.remote";

    let {
        remoteFunction,
        validationSchema,
        initialData = null,
        isUpdating = false,
    }: {
        remoteFunction: typeof createKiosk | typeof updateKiosk;
        validationSchema: any;
        initialData?: any;
        isUpdating?: boolean;
    } = $props();

    let locations = $state<Location[]>([]);
    let loaded = $state(false);
    let selectedLocationIds = $state<string[]>(
        initialData?.locationIds ||
            (initialData?.locationId ? [initialData.locationId] : []),
    );

    // Initial state setup for 'Days' convenience fields
    let initialDays = {
        lookAhead: initialData?.lookAhead
            ? Math.round(initialData.lookAhead / 86400)
            : 28,
        lookPast: initialData?.lookPast
            ? Math.round(initialData.lookPast / 86400)
            : 0,
    };

    onMount(async () => {
        try {
            locations = await listLocations();
            loaded = true;
        } catch (e) {
            console.error("Failed to load locations", e);
            toast.error("Failed to load locations");
        }
    });

    // Helper to access form field helpers from the remote function
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
</script>

<div class="max-w-2xl mx-auto bg-white p-6 rounded-lg shadow">
    <form
        {...remoteFunction
            .preflight(validationSchema)
            .enhance(async ({ submit }: any) => {
                try {
                    const result: any = await submit();
                    if (result?.error) {
                        toast.error(result.error);
                        return;
                    }
                    toast.success(
                        isUpdating ? "Kiosk updated!" : "Kiosk created!",
                    );
                    goto("/kiosks");
                } catch (error: any) {
                    toast.error(
                        error?.message || "An unexpected error occurred",
                    );
                }
            })}
        class="space-y-6"
    >
        {#if isUpdating && initialData}
            <input {...getField("id").as("hidden", initialData.id)} />
        {/if}

        <div class="space-y-2">
            <label for="name" class="block text-sm font-medium text-gray-700"
                >Kiosk Name</label
            >
            <input
                {...getField("name").as("text")}
                value={getField("name").value() ?? initialData?.name ?? ""}
                placeholder="e.g. Main Lobby Screen"
                class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
                onblur={() => remoteFunction.validate()}
            />
            {#each getField("name").issues() ?? [] as issue}
                <p class="mt-1 text-sm text-red-600">{issue.message}</p>
            {/each}
        </div>

        <div class="space-y-2">
            <label
                for="description"
                class="block text-sm font-medium text-gray-700"
                >Description (Optional)</label
            >
            <textarea
                {...getField("description").as("text")}
                rows="3"
                value={getField("description").value() ??
                    initialData?.description ??
                    ""}
                class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
                onblur={() => remoteFunction.validate()}
            ></textarea>
        </div>

        <div class="space-y-2">
            {#if !loaded}
                <div class="animate-pulse h-10 bg-gray-100 rounded"></div>
            {:else}
                <LocationSelector
                    {locations}
                    bind:selectedIds={selectedLocationIds}
                />
                <!-- Hidden input for submission -->
                <input
                    {...getField("locationIds").as(
                        "hidden",
                        JSON.stringify(selectedLocationIds),
                    )}
                />
                {#each getField("locationIds").issues() ?? [] as issue}
                    <p class="mt-1 text-sm text-red-600">{issue.message}</p>
                {/each}
            {/if}
            <p class="text-xs text-gray-500">
                Events linked to this location will be displayed.
            </p>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div class="space-y-2">
                <label
                    for="loopDuration"
                    class="block text-sm font-medium text-gray-700"
                    >Loop Duration (s)</label
                >
                <input
                    {...getField("loopDuration").as("number")}
                    value={getField("loopDuration").value() ??
                        initialData?.loopDuration ??
                        5}
                    min="3"
                    required
                    class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
                />
                <p class="text-xs text-gray-500">Time per slide.</p>
                {#each getField("loopDuration").issues() ?? [] as issue}
                    <p class="mt-1 text-sm text-red-600">{issue.message}</p>
                {/each}
            </div>

            <div class="space-y-2">
                <label
                    for="lookAheadDays"
                    class="block text-sm font-medium text-gray-700"
                    >Look Ahead (Days)</label
                >
                <input
                    {...getField("lookAheadDays").as("number")}
                    value={getField("lookAheadDays").value() ??
                        initialDays.lookAhead}
                    min="0"
                    required
                    class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
                />
                {#each getField("lookAheadDays").issues() ?? [] as issue}
                    <p class="mt-1 text-sm text-red-600">{issue.message}</p>
                {/each}
            </div>

            <div class="space-y-2">
                <label
                    for="lookPastDays"
                    class="block text-sm font-medium text-gray-700"
                    >Look Past (Days)</label
                >
                <input
                    {...getField("lookPastDays").as("number")}
                    value={getField("lookPastDays").value() ??
                        initialDays.lookPast}
                    min="0"
                    required
                    class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
                />
                {#each getField("lookPastDays").issues() ?? [] as issue}
                    <p class="mt-1 text-sm text-red-600">{issue.message}</p>
                {/each}
            </div>
        </div>

        <div class="pt-4 flex justify-end gap-3">
            <Button href="/kiosks" variant="outline" type="button"
                >Cancel</Button
            >
            <AsyncButton type="submit" loading={remoteFunction.pending}>
                {isUpdating ? "Save Changes" : "Create Kiosk"}
            </AsyncButton>
        </div>
    </form>
</div>
