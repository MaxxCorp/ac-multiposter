<script lang="ts">
    import { page } from "$app/state";
    import { readUser } from "./read.remote";
    import Breadcrumb from "$lib/components/ui/Breadcrumb.svelte";
    import ErrorSection from "$lib/components/ui/ErrorSection.svelte";
    import LoadingSection from "$lib/components/ui/LoadingSection.svelte";
    import UserEditForm from "./UserEditForm.svelte";
</script>

<div class="container mx-auto px-4 py-8">
    <div class="max-w-2xl mx-auto">
        {#await readUser(page.params.id || "")}
            <LoadingSection message="Loading user..." />
        {:then user}
            {#if user}
                <Breadcrumb feature="users" current={user.name} />
                <UserEditForm {user} />
            {:else}
                <ErrorSection
                    headline="User Not Found"
                    message="The user you are looking for does not exist."
                    href="/users"
                    button="Back to Users"
                />
            {/if}
        {:catch error}
            <ErrorSection
                headline="Error"
                message={error instanceof Error
                    ? error.message
                    : "Failed to load user"}
                href="/users"
                button="Back to Users"
            />
        {/await}
    </div>
</div>
