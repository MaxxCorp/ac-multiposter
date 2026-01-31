<script lang="ts">
    import ContentBlockEditor from "$lib/components/cms/ContentBlockEditor.svelte";
    import { readContent } from "./read.remote";
    import { updateContent } from "./update.remote";
    import { createBlockFunction } from "./create.remote";
    import { linkBlockFunction } from "./link.remote";
    import { deleteBlockFunction } from "./delete.remote";
    import { listBlocksFunction } from "./list.remote";
    import { renameBlockFunction } from "./rename.remote";
    import LoadingSection from "$lib/components/ui/LoadingSection.svelte";
    import ErrorSection from "$lib/components/ui/ErrorSection.svelte";

    let contentPromise = $state(readContent({}));
</script>

<div class="container mx-auto px-4 py-8">
    <div class="max-w-4xl mx-auto">
        <h1 class="text-3xl font-bold mb-6">Data Privacy (GDPR)</h1>

        {#await contentPromise}
            <LoadingSection />
        {:then result}
            <ContentBlockEditor
                slotName="main"
                currentResult={result}
                remoteRead={readContent}
                remoteUpdate={updateContent}
                remoteCreate={createBlockFunction}
                remoteLink={linkBlockFunction}
                remoteDelete={deleteBlockFunction}
                remoteList={listBlocksFunction}
                remoteRename={renameBlockFunction}
            />
        {:catch error}
            <ErrorSection
                headline="Error loading GDPR"
                message={error.message}
            />
        {/await}
    </div>
</div>
