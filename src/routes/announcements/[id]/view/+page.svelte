<script lang="ts">
    import { page } from "$app/stores";
    import { goto } from "$app/navigation";
    import { readAnnouncement } from "../read.remote";
    import LoadingSection from "$lib/components/ui/LoadingSection.svelte";
    import ErrorSection from "$lib/components/ui/ErrorSection.svelte";
    import Breadcrumb from "$lib/components/ui/Breadcrumb.svelte";
    import { Share2, Pencil } from "@lucide/svelte";
    import Button from "$lib/components/ui/button/button.svelte";
    import AnnouncementView from "$lib/components/announcements/AnnouncementView.svelte";
    import { onMount } from "svelte";

    let id = $derived($page.params.id);
    let dataPromise = $derived(
        id ? readAnnouncement(id) : Promise.reject("No ID"),
    );

    function checkCanEdit(announcement: any) {
        const user = $page.data.user as any;
        // Allow any authenticated user to edit
        return !!user;
    }

    let canShare = $state(false);
    onMount(() => {
        canShare = typeof navigator !== "undefined" && !!navigator.share;
    });

    async function handleShare(announcement: any) {
        if (typeof navigator === "undefined" || !navigator.share) return;
        try {
            await navigator.share({
                title: announcement.title,
                text: announcement.content, // Note: this is HTML content, might want to strip tags for share text
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

                    <AnnouncementView {announcement} />

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

                        {#if checkCanEdit(announcement)}
                            <Button
                                variant="default"
                                class="flex items-center gap-2 bg-blue-600 hover:bg-blue-700"
                                onclick={() =>
                                    goto(`/announcements/${announcement.id}`)}
                            >
                                <Pencil size={18} /> Edit Announcement
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
