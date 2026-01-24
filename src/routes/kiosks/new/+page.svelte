<script lang="ts">
    import Breadcrumb from "$lib/components/ui/Breadcrumb.svelte";
    import KioskForm from "$lib/components/kiosks/KioskForm.svelte";
    import { createKiosk } from "./create.remote";
    import { createKioskSchema } from "$lib/validations/kiosks";
</script>

<div class="container mx-auto px-4 py-8">
    <div class="max-w-3xl mx-auto">
        <Breadcrumb feature="kiosks" current="New Kiosk" />

        <h1 class="text-3xl font-bold mb-8">Create New Kiosk</h1>

        <KioskForm
            remoteFunction={createKiosk}
            validationSchema={createKioskSchema}
        />
    </div>
</div>
