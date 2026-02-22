<script lang="ts">
    import { listKiosks, type Kiosk } from "./list.remote";
    import { deleteKiosk } from "./[id]/delete.remote";
    import Breadcrumb from "$lib/components/ui/Breadcrumb.svelte";
    import Button from "$lib/components/ui/button/button.svelte";
    import AsyncButton from "$lib/components/ui/AsyncButton.svelte";
    import { Monitor, Trash2, Pencil } from "@lucide/svelte";
    import LoadingSection from "$lib/components/ui/LoadingSection.svelte";
    import ErrorSection from "$lib/components/ui/ErrorSection.svelte";
    import EmptyState from "$lib/components/ui/EmptyState.svelte";
    import BulkActionToolbar from "$lib/components/ui/BulkActionToolbar.svelte";
    import { handleDelete } from "$lib/hooks/handleDelete.svelte";

    let itemsPromise = $state<Promise<Kiosk[]>>(listKiosks());
    let initializedItems = $state<Kiosk[]>([]);
    let selectedIds = $state<Set<string>>(new Set());

    function refresh() {
        itemsPromise = listKiosks();
    }

    function isSelected(id: string) {
        return selectedIds.has(id);
    }
    function toggleSelection(id: string) {
        if (selectedIds.has(id)) {
            selectedIds.delete(id);
        } else {
            selectedIds.add(id);
        }
        selectedIds = new Set(selectedIds);
    }
    function selectAll(items: Kiosk[]) {
        selectedIds = new Set(items.map((item) => item.id));
    }
    function deselectAll() {
        selectedIds = new Set();
    }
</script>

<div class="container mx-auto px-4 py-8">
    <div class="max-w-4xl mx-auto">
        <Breadcrumb feature="kiosks" />

        <div class="bg-white shadow rounded-lg p-6">
            <div
                class="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4"
            >
                <h1 class="text-3xl font-bold flex-shrink-0">Kiosks</h1>
                <div class="flex-1 flex justify-end w-full md:w-auto">
                    <BulkActionToolbar
                        selectedCount={selectedIds.size}
                        totalCount={initializedItems.length}
                        onSelectAll={() => selectAll(initializedItems)}
                        onDeselectAll={deselectAll}
                        onDelete={async () => {
                            await handleDelete({
                                ids: [...selectedIds],
                                deleteFn: deleteKiosk,
                                itemName: "kiosk",
                            });
                            deselectAll();
                            refresh();
                        }}
                        newItemHref="/kiosks/new"
                        newItemLabel="+ New Kiosk"
                    />
                </div>
            </div>

            {#await itemsPromise}
                <LoadingSection message="Loading kiosks..." />
            {:then items}
                {@html (() => {
                    initializedItems = items;
                    return "";
                })()}

                <div class="grid gap-4">
                    {#if items.length === 0}
                        <EmptyState
                            icon={Monitor}
                            title="No Kiosks"
                            description="Configure your first kiosk location display."
                            actionLabel="Create Kiosk"
                            actionHref="/kiosks/new"
                        />
                    {:else}
                        {#each items as kiosk (kiosk.id)}
                            <div class="mb-6 last:mb-0">
                                <div
                                    class="bg-white shadow border rounded-lg p-6 flex flex-col sm:flex-row items-start gap-4 transition-shadow"
                                >
                                    <input
                                        type="checkbox"
                                        checked={isSelected(kiosk.id)}
                                        onchange={() =>
                                            toggleSelection(kiosk.id)}
                                        class="mt-1 w-4 h-4 text-blue-600"
                                    />

                                    <div class="flex-1">
                                        <div
                                            class="flex items-start gap-3 mb-2"
                                        >
                                            <div class="flex-1">
                                                <h2
                                                    class="text-xl font-semibold"
                                                >
                                                    <a
                                                        href={`/kiosks/${kiosk.id}/view`}
                                                        target="_blank"
                                                        class="hover:underline text-blue-600"
                                                    >
                                                        {kiosk.name}
                                                    </a>
                                                </h2>
                                            </div>
                                        </div>

                                        {#if kiosk.description}
                                            <div class="mt-2 text-gray-600">
                                                <p>{kiosk.description}</p>
                                            </div>
                                        {/if}

                                        <div
                                            class="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-sm text-gray-600"
                                        >
                                            <div>
                                                <span class="text-gray-500 mr-1"
                                                    >Loop:</span
                                                >
                                                <span class="font-medium"
                                                    >{kiosk.loopDuration}s</span
                                                >
                                            </div>
                                            <div>
                                                <span class="text-gray-500 mr-1"
                                                    >Look Ahead:</span
                                                >
                                                <span class="font-medium"
                                                    >{Math.round(
                                                        kiosk.lookAhead / 86400,
                                                    )} days</span
                                                >
                                            </div>
                                            <div>
                                                <span class="text-gray-500 mr-1"
                                                    >Look Past:</span
                                                >
                                                <span class="font-medium"
                                                    >{Math.round(
                                                        kiosk.lookPast / 86400,
                                                    )} days</span
                                                >
                                            </div>
                                        </div>

                                        <div class="mt-4">
                                            <p class="text-xs text-gray-400">
                                                Created: {new Date(
                                                    kiosk.createdAt,
                                                ).toLocaleString()}
                                            </p>
                                        </div>
                                    </div>

                                    <div class="flex flex-col gap-2 shrink-0">
                                        <Button
                                            href={`/kiosks/${kiosk.id}`}
                                            variant="default"
                                            size="default"
                                            class="flex items-center gap-2 w-[120px] justify-center"
                                        >
                                            <Pencil size={16} /> Edit
                                        </Button>
                                        <AsyncButton
                                            variant="destructive"
                                            size="default"
                                            loading={false}
                                            loadingLabel="Deleting..."
                                            class="flex items-center gap-2 w-[120px] justify-center"
                                            onclick={async () => {
                                                const success =
                                                    await handleDelete({
                                                        ids: [kiosk.id],
                                                        deleteFn: deleteKiosk,
                                                        itemName: "kiosk",
                                                    });
                                                if (success) refresh();
                                            }}
                                        >
                                            <Trash2 size={16} /> Delete
                                        </AsyncButton>
                                    </div>
                                </div>
                            </div>
                        {/each}
                    {/if}
                </div>
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
