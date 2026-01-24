<script lang="ts">
    import Breadcrumb from "$lib/components/ui/Breadcrumb.svelte";
    import KioskForm from "$lib/components/kiosks/KioskForm.svelte";
    import { getKiosk } from "./read.remote";
    import { updateKiosk } from "./update.remote";
    import { updateKioskSchema } from "$lib/validations/kiosks";
    import { page } from "$app/state";
    import LoadingSection from "$lib/components/ui/LoadingSection.svelte";
    import ErrorSection from "$lib/components/ui/ErrorSection.svelte";

    let kioskId = $derived(page.params.id!);
    let kioskPromise = $derived(getKiosk(kioskId));
</script>

<div class="container mx-auto px-4 py-8">
    <div class="max-w-3xl mx-auto">
        <Breadcrumb feature="kiosks" current="Edit Kiosk" />

        <h1 class="text-3xl font-bold mb-8">Edit Kiosk</h1>

        {#await kioskPromise}
            <LoadingSection message="Loading kiosk..." />
        {:then kiosk}
            {#if kiosk}
                <KioskForm
                    remoteFunction={updateKiosk}
                    validationSchema={updateKioskSchema}
                    initialData={kiosk}
                    isUpdating={true}
                />
            {:else}
                <ErrorSection
                    headline="Kiosk not found"
                    message="The requested kiosk could not be found."
                    href="/kiosks"
                    button="Back to List"
                />
            {/if}
        {:catch err}
            <ErrorSection
                headline="Error loading kiosk"
                message={err.message}
                href="/kiosks"
                button="Back to List"
            />
        {/await}
    </div>
</div>
