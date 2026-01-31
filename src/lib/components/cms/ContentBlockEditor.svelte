<script lang="ts">
    import RichTextEditor from "./RichTextEditor.svelte";
    import { Button } from "$lib/components/ui/button";
    import AsyncButton from "$lib/components/ui/AsyncButton.svelte";
    import { toast } from "svelte-sonner";
    import type { readContent } from "../../../routes/imprint/read.remote";
    import { invalidateAll } from "$app/navigation";
    import { locales } from "$lib/paraglide/runtime"; // Dynamic locales
    import * as Dialog from "$lib/components/ui/dialog";

    type ReadResult = Awaited<ReturnType<typeof readContent>>;

    let {
        slotName,
        currentResult,
        remoteRead,
        remoteUpdate,
        remoteCreate,
        remoteLink,
        remoteDelete,
        remoteList, // New prop
        remoteRename, // New prop
    } = $props<{
        slotName: string;
        currentResult: ReadResult;
        remoteRead: any;
        remoteUpdate: any;
        remoteCreate: any;
        remoteLink: any;
        remoteDelete: any;
        remoteList?: any;
        remoteRename?: any;
    }>();

    // Initialize state from props immediately
    let isEditing = $state(false);
    let language = $state(currentResult?.content?.language ?? "en");
    let branch = $state(currentResult?.content?.branch ?? "draft"); // Default to draft usually for editing?
    // Actually, if we view published, we see published. If we edit, we probably want to start from what we see,
    // BUT we should be explicit. If I view published 'en', I start editing 'en' 'published'?
    // Usually you edit a draft. If I edit published, I am creating a NEW draft or overwriting published?
    // The current logic allows overwriting published.
    // Let's stick to: initialize with what we see.

    let editorContent = $state("");

    // Switch Block State
    let showSwitchModal = $state(false);
    let availableBlocks = $state<any[]>([]);
    let selectedBlockId = $state("");

    let currentBlock = $derived(currentResult?.block);
    let currentContentVersion = $derived(currentResult?.content);
    let currentHtml = $derived(
        (currentContentVersion?.content as any)?.html ?? "",
    );

    // Watch for prop changes to update local state if we aren't editing
    $effect(() => {
        if (!isEditing && currentResult?.content) {
            language = currentResult.content.language;
            branch = currentResult.content.branch;
        }
    });

    function startEditing() {
        if (!currentBlock) return;
        // Load whatever content matches the CURRENT selectors (which match the view initially)
        // Check if we need to fetch specific content or if currentResult is enough.
        // If currentResult matches language/branch, use it.
        if (
            currentResult?.content?.language === language &&
            currentResult?.content?.branch === branch
        ) {
            editorContent = currentHtml;
        } else {
            // If selectors don't match view (unlikely on start), fetch.
            fetchEditorContent();
        }
        isEditing = true;
    }

    async function fetchEditorContent() {
        if (!currentBlock || !isEditing) return;
        try {
            // Fetch specific content for the selected language/branch
            const result = await remoteRead({ language, branch });

            // Note: remoteRead logic currently FALLS BACK to 'en' if specific lang missing.
            // For editing, this might be confusing if we select 'de' and get 'en'.
            // But it's better than empty if we treat it as "translate from en".
            // Ideally, we'd know if it was a fallback.
            // For now, just load what we get.

            if (result?.content) {
                // Check if the returned content actually matches requested language?
                // result.content.language might be 'en' even if we asked for 'de'.
                // If so, maybe we should show a toast "Loaded fallback content"?
                if (result.content.language !== language) {
                    // We got fallback. That's okay, but maybe let user know?
                    // toast.info(`Loaded ${result.content.language} content as template`);
                }
                editorContent = (result.content.content as any)?.html ?? "";
            } else {
                editorContent = ""; // Truly empty
            }
        } catch (e: any) {
            console.error(e);
            const msg =
                e?.message ||
                (typeof e === "object" ? JSON.stringify(e) : String(e));
            toast.error(`Load Error: ${msg}`);
        }
    }

    $effect(() => {
        if (isEditing) {
            // When language or branch changes, fetch new content
            // Usage of untracked might be needed if we don't want this firing on mount?
            // But we want it to fire if they change.
            fetchEditorContent();
        }
    });

    function cancelEditing() {
        isEditing = false;
        // We don't reset language/branch here, sticking to what they selected?
        // Or revert to view? Reverting to view (prop) seems safer for "Cancel".
        if (currentResult?.content) {
            language = currentResult.content.language;
            branch = currentResult.content.branch;
        }
        editorContent = currentHtml;
    }

    async function handleSave() {
        if (!currentBlock) return;
        try {
            const result = await remoteUpdate({
                blockId: currentBlock.id,
                language,
                branch,
                content: editorContent,
            });
            if (result?.success) {
                toast.success(`Saved (${language}/${branch})`);
                await invalidateAll();
                isEditing = false;
            } else {
                toast.error(result?.error?.message ?? "Failed to save");
            }
        } catch (e: any) {
            toast.error(e.message);
        }
    }

    async function handlePublish() {
        if (!currentBlock) return;
        if (
            !confirm(
                "Overwrite the PUBLISHED version with current editor content?",
            )
        )
            return;

        try {
            const result = await remoteUpdate({
                blockId: currentBlock.id,
                language,
                branch: "published",
                content: editorContent,
            });
            if (result?.success) {
                toast.success("Published successfully!");
                await invalidateAll();
                isEditing = false;
            }
        } catch (e: any) {
            toast.error(e.message);
        }
    }

    async function handleCreateBlock() {
        const name = prompt("Enter new block name:");
        if (!name) return;
        try {
            const result = await remoteCreate({
                name,
                description: `Created for slot ${slotName}`,
            });
            if (result?.success) {
                toast.success("Block created and linked!");
                await invalidateAll();
                // We could auto-start editing, but we need to wait for reload.
            }
        } catch (e: any) {
            toast.error(e.message);
        }
    }

    async function handleRenameBlock() {
        if (!currentBlock || !remoteRename) return;
        const newName = prompt("Enter new name:", currentBlock.name);
        if (!newName || newName === currentBlock.name) return;

        try {
            const result = await remoteRename({
                blockId: currentBlock.id,
                newName,
            });
            if (result?.success) {
                toast.success("Renamed successfully");
                await invalidateAll();
            }
        } catch (e: any) {
            toast.error(e.message);
        }
    }

    async function openSwitchModal() {
        if (!remoteList) return;
        try {
            availableBlocks = await remoteList();
            showSwitchModal = true;
        } catch (e: any) {
            toast.error("Failed to load blocks");
        }
    }

    async function handleSwitchBlock() {
        if (!selectedBlockId || !remoteLink) return;
        try {
            const result = await remoteLink({ blockId: selectedBlockId });
            if (result?.success) {
                toast.success("Block switched!");
                await invalidateAll();
                showSwitchModal = false;
            }
        } catch (e: any) {
            toast.error(e.message);
        }
    }

    async function handleDeleteBlock() {
        if (
            !currentBlock ||
            !confirm("Unlink and delete this block? This cannot be undone.")
        )
            return;
        try {
            const result = await remoteDelete({ blockId: currentBlock.id });
            if (result?.success) {
                toast.success("Block deleted");
                await invalidateAll();
            }
        } catch (e: any) {
            toast.error(e.message);
        }
    }
</script>

<div class="cms-block-editor">
    {#if !currentBlock}
        <div
            class="p-8 text-center bg-gray-50 border border-dashed border-gray-300 rounded-lg"
        >
            <h3 class="text-lg font-medium text-gray-900">No Content Linked</h3>
            <p class="mt-1 text-sm text-gray-500">Slot: {slotName}</p>
            <div class="mt-6 flex justify-center gap-4">
                <AsyncButton onclick={handleCreateBlock}
                    >Create New Block</AsyncButton
                >
                {#if remoteList}
                    <Button variant="outline" onclick={openSwitchModal}
                        >Link Existing Block</Button
                    >
                {/if}
            </div>
        </div>
    {:else if !isEditing}
        <!-- View Mode -->
        <div class="mb-6 border-b pb-4">
            <div class="flex justify-between items-start">
                <div>
                    <!-- Optional: Show block name if admin -->
                    <div class="text-xs text-gray-400 font-mono mb-1">
                        Block: {currentBlock.name} ({currentResult?.content
                            ?.language ?? "default"}/{currentResult?.content
                            ?.branch ?? "default"})
                    </div>
                </div>
                <div class="flex gap-2">
                    <Button variant="outline" size="sm" onclick={startEditing}
                        >Edit</Button
                    >
                    {#if remoteList}
                        <Button
                            variant="ghost"
                            size="sm"
                            onclick={openSwitchModal}>Switch</Button
                        >
                    {/if}
                </div>
            </div>
        </div>

        <div class="prose max-w-none">
            {@html currentHtml}
        </div>
    {:else}
        <!-- Edit Mode -->
        <div
            class="edit-ui bg-white border rounded-lg shadow-sm p-4 mt-4 ring-1 ring-gray-200"
        >
            <div
                class="flex flex-wrap gap-4 mb-4 items-center justify-between border-b pb-4"
            >
                <div class="flex gap-3 items-center flex-wrap">
                    <!-- Language Selector -->
                    <div class="flex items-center gap-1">
                        <span class="text-xs font-medium text-gray-500"
                            >Lang:</span
                        >
                        <select
                            bind:value={language}
                            class="border rounded px-2 py-1 text-sm bg-gray-50"
                        >
                            {#each locales as loc}
                                <option value={loc}>{loc}</option>
                            {/each}
                        </select>
                    </div>

                    <!-- Branch Selector -->
                    <div class="flex items-center gap-1">
                        <span class="text-xs font-medium text-gray-500"
                            >Branch:</span
                        >
                        <select
                            bind:value={branch}
                            class="border rounded px-2 py-1 text-sm bg-gray-50"
                        >
                            <option value="draft">Draft</option>
                            <option value="published">Published</option>
                        </select>
                    </div>

                    <!-- Block Info -->
                    <div class="flex items-center gap-2 pl-2 border-l">
                        <span
                            class="text-xs text-gray-500 truncate max-w-[150px]"
                            title={currentBlock.name}>{currentBlock.name}</span
                        >
                        {#if remoteRename}
                            <button
                                onclick={handleRenameBlock}
                                class="text-xs text-blue-600 hover:underline"
                                >Rename</button
                            >
                        {/if}
                    </div>
                </div>

                <div class="flex gap-2">
                    <AsyncButton
                        variant="destructive"
                        size="sm"
                        onclick={handleDeleteBlock}>Delete Block</AsyncButton
                    >
                </div>
            </div>

            <div class="mb-4 min-h-[300px]">
                <RichTextEditor bind:value={editorContent} />
            </div>

            <div class="flex gap-3 justify-end items-center pt-2 border-t">
                <span class="text-xs text-gray-400 mr-auto">
                    Editing: {language} / {branch}
                </span>
                <Button variant="ghost" onclick={cancelEditing}>Cancel</Button>
                <AsyncButton variant="outline" onclick={handleSave}
                    >Save Draft</AsyncButton
                >
                <AsyncButton
                    onclick={handlePublish}
                    class="bg-green-600 hover:bg-green-700 text-white"
                    >Publish</AsyncButton
                >
            </div>
        </div>
    {/if}

    <!-- Switch Block Modal -->
    <Dialog.Root bind:open={showSwitchModal}>
        <Dialog.Content>
            <Dialog.Header>
                <Dialog.Title>Link Existing Block</Dialog.Title>
                <Dialog.Description
                    >Select a content block to display in this slot.</Dialog.Description
                >
            </Dialog.Header>

            <div class="py-4">
                {#if availableBlocks.length === 0}
                    <p class="text-sm text-gray-500">No other blocks found.</p>
                {:else}
                    <select
                        bind:value={selectedBlockId}
                        class="w-full border rounded p-2"
                    >
                        <option value="">-- Select a block --</option>
                        {#each availableBlocks as block}
                            <option value={block.id}>{block.name}</option>
                        {/each}
                    </select>
                {/if}
            </div>

            <Dialog.Footer>
                <Button
                    variant="outline"
                    onclick={() => (showSwitchModal = false)}>Cancel</Button
                >
                <AsyncButton
                    onclick={handleSwitchBlock}
                    disabled={!selectedBlockId}>Link Block</AsyncButton
                >
            </Dialog.Footer>
        </Dialog.Content>
    </Dialog.Root>
</div>
