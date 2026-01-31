<script lang="ts">
    import type { Location } from "../../../routes/locations/list.remote";

    let {
        selectedIds = $bindable([]),
        locations = [],
        label = "Locations",
    }: {
        selectedIds: string[];
        locations: Location[];
        label?: string;
    } = $props();

    function toggleLocation(id: string) {
        if (selectedIds.includes(id)) {
            selectedIds = selectedIds.filter((x) => x !== id);
        } else {
            selectedIds = [...selectedIds, id];
        }
    }
</script>

<div class="space-y-2">
    <span class="block text-sm font-medium text-gray-700">{label}</span>
    <div
        class="space-y-1 border rounded-md p-4 max-h-64 overflow-y-auto bg-gray-50"
    >
        {#if locations.length === 0}
            <p class="text-sm text-gray-500 italic">No locations available.</p>
        {:else}
            {#each locations as location}
                <label
                    class="flex items-center gap-2 py-1 px-2 hover:bg-white rounded transition-colors cursor-pointer"
                >
                    <input
                        type="checkbox"
                        checked={selectedIds.includes(location.id)}
                        onclick={() => toggleLocation(location.id)}
                        class="w-4 h-4 text-blue-600 flex-shrink-0 rounded border-gray-300 focus:ring-blue-500"
                    />
                    <div class="text-sm">
                        <span class="font-medium text-gray-900"
                            >{location.name}</span
                        >
                        {#if location.roomId}
                            <span class="text-gray-500 ml-1"
                                >({location.roomId})</span
                            >
                        {/if}
                    </div>
                </label>
            {/each}
        {/if}
    </div>
    <div class="text-xs text-gray-500 text-right">
        {selectedIds.length} location{selectedIds.length !== 1 ? "s" : ""} selected
    </div>
</div>
