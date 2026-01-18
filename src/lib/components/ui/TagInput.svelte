<script lang="ts">
    import { Tag as TagIcon } from "@lucide/svelte";

    let {
        value = $bindable(""),
        placeholder = "e.g. Customer, Lead, Priority",
        label = "Tags (comma separated)",
        icon = true,
    } = $props();

    // The parent binds to 'value' which is a comma-separated string
</script>

<div>
    <label
        for="tags-input"
        class="block text-sm font-medium text-gray-700 flex items-center gap-2 mb-1"
    >
        {#if icon}
            <TagIcon size={16} class="text-indigo-500" />
        {/if}
        {label}
    </label>
    <input
        type="text"
        id="tags-input"
        bind:value
        {placeholder}
        class="block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
    />
</div>
