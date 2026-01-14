<script lang="ts">
    import { deleteUser } from "./[id]/delete.remote";

    import type { User } from "./list.remote";
    import Button from "$lib/components/ui/button/button.svelte";
    import AsyncButton from "$lib/components/ui/AsyncButton.svelte";
    import { User as UserIcon } from "@lucide/svelte";

    import BulkActionToolbar from "$lib/components/ui/BulkActionToolbar.svelte";
    import { handleDelete } from "$lib/hooks/handleDelete.svelte";
    import EmptyState from "$lib/components/ui/EmptyState.svelte";

    let { items, onRefresh }: { items: User[]; onRefresh: () => void } =
        $props();

    let selectedIds = $state<Set<string>>(new Set());

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
    function selectAll(currentItems: User[]) {
        selectedIds = new Set(currentItems.map((item) => item.id));
    }
    function deselectAll() {
        selectedIds = new Set();
    }

    function formatRoles(user: User) {
        const roles = Array.isArray(user.roles) ? user.roles : [];
        if (roles.length === 0) return "User";
        return roles.join(", ");
    }
</script>

<div class="bg-white shadow rounded-lg p-6">
    <div
        class="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4"
    >
        <h1 class="text-3xl font-bold flex-shrink-0">Users</h1>
        <div class="flex-1 flex justify-end w-full md:w-auto">
            <BulkActionToolbar
                selectedCount={selectedIds.size}
                totalCount={items.length}
                onSelectAll={() => selectAll(items)}
                onDeselectAll={deselectAll}
                onDelete={async () => {
                    await handleDelete({
                        ids: [...selectedIds],
                        deleteFn: deleteUser,
                        itemName: "user",
                    });
                    deselectAll();
                    onRefresh();
                }}
            />
        </div>
    </div>

    <div class="grid gap-4">
        {#if items.length === 0}
            <EmptyState
                icon={UserIcon}
                title="No Users"
                description="No users found."
                actionLabel=""
                actionHref=""
            />
        {:else}
            {#each items as user (user.id)}
                <div class="mb-6 last:mb-0">
                    <div
                        class="bg-white shadow rounded-lg p-6 flex flex-col sm:flex-row items-start gap-4 transition-shadow"
                    >
                        <input
                            type="checkbox"
                            checked={isSelected(user.id)}
                            onchange={() => toggleSelection(user.id)}
                            class="mt-1 w-4 h-4 text-blue-600"
                        />
                        {#if user.image}
                            <img
                                src={user.image}
                                alt={user.name}
                                class="w-10 h-10 rounded-full"
                            />
                        {:else}
                            <div
                                class="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center"
                            >
                                <UserIcon class="w-6 h-6 text-gray-500" />
                            </div>
                        {/if}
                        <div class="flex-1 w-full min-w-0">
                            <div class="flex items-start gap-3 mb-2">
                                <div class="flex-1 min-w-0">
                                    <h2
                                        class="text-xl font-semibold break-words"
                                    >
                                        <a
                                            href={`/users/${user.id}`}
                                            class="hover:underline text-blue-600"
                                        >
                                            {user.name}
                                        </a>
                                    </h2>
                                    <p class="text-gray-600 break-all">
                                        {user.email}
                                    </p>
                                </div>
                            </div>
                            <div class="mt-2">
                                <span
                                    class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                                >
                                    {formatRoles(user)}
                                </span>
                            </div>
                            <div class="mt-3">
                                <p class="text-xs text-gray-500 mt-3">
                                    Joined: {new Date(
                                        user.createdAt,
                                    ).toLocaleDateString()}
                                </p>
                            </div>
                        </div>
                        <div class="flex flex-col gap-2 shrink-0">
                            <Button
                                href={`/users/${user.id}`}
                                variant="default"
                                size="default"
                                class="text-center"
                            >
                                Edit
                            </Button>
                            <AsyncButton
                                variant="destructive"
                                size="default"
                                loading={false}
                                loadingLabel="Deleting..."
                                onclick={async () => {
                                    const success = await handleDelete({
                                        ids: [user.id],
                                        deleteFn: deleteUser,
                                        itemName: "user",
                                    });
                                    if (success) {
                                        deselectAll();
                                        onRefresh();
                                    }
                                }}
                            >
                                Delete
                            </AsyncButton>
                        </div>
                    </div>
                </div>
            {/each}
        {/if}
    </div>
</div>
