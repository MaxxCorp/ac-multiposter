<script lang="ts">
    import { Calendar } from "@lucide/svelte";
    import type { Announcement } from "../../../routes/announcements/list.remote";

    let { announcement } = $props<{ announcement: any }>();
</script>

<div class="space-y-8">
    <div class="border-b pb-6">
        <div class="flex items-center gap-3 mb-2 flex-wrap">
            <h1 class="text-3xl font-bold text-gray-900">
                {announcement.title}
            </h1>
            {#if announcement.isPublic}
                <span
                    class="px-2 py-0.5 bg-green-100 text-green-800 text-xs font-medium rounded-full"
                    >Public</span
                >
            {/if}
        </div>
        <div class="text-sm text-gray-500 flex items-center gap-2 mt-2">
            <Calendar size={14} />
            Updated on {new Date(announcement.updatedAt).toLocaleDateString()}
        </div>
    </div>

    <div class="prose max-w-none text-gray-700 whitespace-pre-wrap">
        {@html announcement.content}
    </div>
</div>
