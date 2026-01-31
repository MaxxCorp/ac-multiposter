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

    // Client-side call to read content
    // We can also pass data from server load if we wanted SSR, but remote pattern implies client fetch often.
    // However, for SEO (Imprint/GDPR), SSR is better.
    // User requested "sveltkit remote functions".
    // If I call `readContent()` here in script, it runs on mount (client).
    // For SEO, we really want server load.
    // But user insisted on remote functions over "old style load functions".
    // `query` remote functions can be awaited in server load, or used on client.
    // Let's use `await readContent()` in a simplified Runes way.
    // Or just let it load on client. For simplicity and user request alignment, client-side is fine or `await` in +page.ts?
    // User said "consult implementation of campaigns". `campaigns/list.remote.ts` is imported in `+page.svelte`: `let itemsPromise = $state(listCampaigns());`.
    // So it's client-side fetching. I will follow that pattern.

    // Note: I can't easily pass localized "Accept-Language" to client-side fetch unless I inspect navigator.language or similar.
    // The browser automatically sends Accept-Language header to the RPC endpoint.
    // So `readContent` backend logic using `params` or headers is fine.
    // If using headers, it works.

    let contentPromise = $state(readContent({}));
</script>

<div class="container mx-auto px-4 py-8">
    <div class="max-w-4xl mx-auto">
        <h1 class="text-3xl font-bold mb-6">Imprint</h1>

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
                headline="Error loading Imprint"
                message={error.message}
            />
        {/await}
    </div>
</div>
