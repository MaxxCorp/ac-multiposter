<script lang="ts">
    import { listKiosks, type Kiosk } from "./list.remote";
    import { deleteKiosk } from "./[id]/delete.remote";
    import Breadcrumb from "$lib/components/ui/Breadcrumb.svelte";
    import Button from "$lib/components/ui/button/button.svelte";
    import AsyncButton from "$lib/components/ui/AsyncButton.svelte";
    import { Monitor, Trash2, Pencil, ExternalLink } from "@lucide/svelte";
    import LoadingSection from "$lib/components/ui/LoadingSection.svelte";
    import ErrorSection from "$lib/components/ui/ErrorSection.svelte";
    import EmptyState from "$lib/components/ui/EmptyState.svelte";
    import { handleDelete } from "$lib/hooks/handleDelete.svelte";

    let itemsPromise = $state<Promise<Kiosk[]>>(listKiosks());

    function refresh() {
        itemsPromise = listKiosks();
    }
</script>

<div class="container mx-auto px-4 py-8">
    <div class="max-w-5xl mx-auto">
        <Breadcrumb feature="kiosks" />

        <div class="bg-white shadow rounded-lg p-6">
            <div
                class="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4"
            >
                <h1 class="text-3xl font-bold flex-shrink-0">Kiosks</h1>
                <Button href="/kiosks/new" variant="default">
                    + New Kiosk
                </Button>
            </div>

            {#await itemsPromise}
                <LoadingSection message="Loading kiosks..." />
            {:then items}
                {#if items.length === 0}
                    <EmptyState
                        icon={Monitor}
                        title="No Kiosks"
                        description="Configure your first kiosk location display."
                        actionLabel="Create Kiosk"
                        actionHref="/kiosks/new"
                    />
                {:else}
                    <div
                        class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                    >
                        {#each items as kiosk (kiosk.id)}
                            <div
                                class="bg-white border rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow flex flex-col"
                            >
                                <div class="p-6 flex-1">
                                    <h3
                                        class="text-lg font-semibold text-gray-900 mb-1"
                                    >
                                        {kiosk.name}
                                    </h3>
                                    {#if kiosk.description}
                                        <p class="text-sm text-gray-500 mb-4">
                                            {kiosk.description}
                                        </p>
                                    {/if}

                                    <div
                                        class="space-y-2 text-sm text-gray-600"
                                    >
                                        <div class="flex justify-between">
                                            <span>Loop:</span>
                                            <span class="font-medium"
                                                >{kiosk.loopDuration}s</span
                                            >
                                        </div>
                                        <div class="flex justify-between">
                                            <span>Look Ahead:</span>
                                            <span class="font-medium"
                                                >{Math.round(
                                                    kiosk.lookAhead / 86400,
                                                )} days</span
                                            >
                                        </div>
                                        <div class="flex justify-between">
                                            <span>Look Past:</span>
                                            <span class="font-medium"
                                                >{Math.round(
                                                    kiosk.lookPast / 86400,
                                                )} days</span
                                            >
                                        </div>
                                    </div>
                                </div>
                                <div
                                    class="bg-gray-50 px-6 py-4 flex items-center justify-between border-t gap-2"
                                >
                                    <a
                                        href={`/kiosks/${kiosk.id}/view`}
                                        target="_blank"
                                        class="text-blue-600 hover:text-blue-800 flex items-center gap-1 text-sm font-medium"
                                    >
                                        <ExternalLink class="w-4 h-4" /> View
                                    </a>
                                    <div class="flex gap-2">
                                        <Button
                                            href={`/kiosks/${kiosk.id}`}
                                            variant="default"
                                            size="sm"
                                            class="flex items-center gap-2 w-[120px] justify-center"
                                        >
                                            <Pencil class="w-4 h-4" /> Edit
                                        </Button>
                                        <AsyncButton
                                            variant="destructive"
                                            size="sm"
                                            class="flex items-center gap-2 w-[120px] justify-center"
                                            loadingLabel="Deleting..."
                                            onclick={async () => {
                                                const success =
                                                    await handleDelete({
                                                        ids: [kiosk.id],
                                                        deleteFn: deleteKiosk,
                                                        itemName: "kiosk",
                                                    });
                                                if (success) refresh();
                                            }}
                                            }}
                                        >
                                            <Trash2 class="w-4 h-4" /> Delete
                                        </AsyncButton>
                                    </div>
                                </div>
                            </div>
                        {/each}
                    </div>
                {/if}
            {:catch error}
                <ErrorSection
                    headline="Failed to load kiosks"
                    message={error?.message || "An unexpected error occurred."}
                    href="/kiosks"
                    button="Retry"
                />
            {/await}
        </div>
    </div>
</div>
