<script lang="ts">
    import AnnouncementForm from "$lib/components/announcements/AnnouncementForm.svelte";
    import { updateExistingAnnouncement } from "./update.remote";
    import { updateAnnouncementSchema } from "$lib/validations/announcements";
    import { readAnnouncement } from "./read.remote";
    import { page } from "$app/stores";

    let announcement = $state<any>(null);
    let id = $derived($page.params.id);

    $effect(() => {
        if (id) {
            readAnnouncement(id).then((res) => {
                announcement = res;
            });
        }
    });
</script>

{#if announcement}
    <AnnouncementForm
        remoteFunction={updateExistingAnnouncement}
        validationSchema={updateAnnouncementSchema}
        isUpdating={true}
        initialData={announcement}
    />
{:else}
    <div class="p-8 text-center text-gray-500">Loading...</div>
{/if}
