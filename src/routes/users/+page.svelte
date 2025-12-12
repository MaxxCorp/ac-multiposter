<script lang="ts">
    import { listUsers } from "./list.remote";
    import Breadcrumb from "$lib/components/ui/Breadcrumb.svelte";
    import LoadingSection from "$lib/components/ui/LoadingSection.svelte";
    import ErrorSection from "$lib/components/ui/ErrorSection.svelte";
    import UserList from "./UserList.svelte";

    let itemsPromise = $state(listUsers());

    function refresh() {
        itemsPromise = listUsers();
    }
</script>

<div class="container mx-auto px-4 py-8">
    <div class="max-w-4xl mx-auto">
        <Breadcrumb feature="users" />

        {#await itemsPromise}
            <LoadingSection message="Loading users..." />
        {:then items}
            <UserList {items} onRefresh={refresh} />
        {:catch error}
            <ErrorSection
                headline="Failed to load users"
                message={error?.message || "An unexpected error occurred."}
                href="/users"
                button="Retry"
            />
        {/await}
    </div>
</div>
