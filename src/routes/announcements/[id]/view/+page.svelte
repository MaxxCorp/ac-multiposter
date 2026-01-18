<script lang="ts">
    import { page } from "$app/stores";
    import { readAnnouncement } from "../read.remote";
    import LoadingSection from "$lib/components/ui/LoadingSection.svelte";
    import ErrorSection from "$lib/components/ui/ErrorSection.svelte";
    import Breadcrumb from "$lib/components/ui/Breadcrumb.svelte";
    import { Calendar, Share2 } from "@lucide/svelte";
    import Button from "$lib/components/ui/button/button.svelte";
    import { onMount } from "svelte";

    let id = $derived($page.params.id);
    let dataPromise = $derived(
        id ? readAnnouncement(id) : Promise.reject("No ID"),
    );

    let canShare = $state(false);
    onMount(() => {
        canShare = typeof navigator !== "undefined" && !!navigator.share;
    });

    async function handleShare(announcement: any) {
        if (typeof navigator === "undefined" || !navigator.share) return;
        try {
            await navigator.share({
                title: announcement.title,
                text: announcement.content,
                url: window.location.href,
            });
        } catch (err) {
            console.error("Error sharing:", err);
        }
    }
</script>

<div class="container mx-auto px-4 py-8">
    <div class="max-w-4xl mx-auto">
        {#await dataPromise}
            <LoadingSection message="Loading announcement..." />
        {:then announcement}
            {#if announcement}
                <div
                    class="bg-white shadow-xl rounded-2xl p-8 border border-gray-100 space-y-8"
                >
                    <Breadcrumb
                        feature="announcements"
                        current={announcement.title}
                    />

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
                        <div
                            class="text-sm text-gray-500 flex items-center gap-2 mt-2"
                        >
                            <Calendar size={14} />
                            Updated on {new Date(
                                announcement.updatedAt,
                            ).toLocaleDateString()}
                        </div>
                    </div>

                    <div
                        class="prose max-w-none text-gray-700 whitespace-pre-wrap"
                    >
                        {announcement.content}
                    </div>

                    <div class="flex flex-wrap gap-4 pt-8 border-t">
                        {#if canShare}
                            <Button
                                variant="outline"
                                class="flex items-center gap-2"
                                onclick={() => handleShare(announcement)}
                            >
                                <Share2 size={18} /> Share
                            </Button>
                        {/if}
                    </div>
                </div>
            {:else}
                <ErrorSection
                    headline="Announcement Not Found"
                    message="The announcement you are looking for does not exist or is not public."
                    href="/announcements"
                    button="Back to Announcements"
                />
            {/if}
        {:catch error}
            <ErrorSection
                headline="Error"
                message={error?.message || "Failed to load announcement"}
                href="/announcements"
                button="Back to Announcements"
            />
        {/await}
    </div>
</div>
