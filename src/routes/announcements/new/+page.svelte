<script lang="ts">
    import AnnouncementForm from "$lib/components/announcements/AnnouncementForm.svelte";
    import { createNewAnnouncement } from "./create.remote";
    import { createAnnouncementSchema } from "$lib/validations/announcements";
</script>

<AnnouncementForm
    remoteFunction={createNewAnnouncement}
    validationSchema={createAnnouncementSchema}
/>
