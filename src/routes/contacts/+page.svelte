<script lang="ts">
    import { listContacts } from "./list.remote";
    import { type Contact } from "$lib/validations/contacts";
    import { deleteExistingContact } from "./[id]/delete.remote";
    import Breadcrumb from "$lib/components/ui/Breadcrumb.svelte";
    import Button from "$lib/components/ui/button/button.svelte";
    import AsyncButton from "$lib/components/ui/AsyncButton.svelte";
    import {
        User as UserIcon,
        Mail,
        Phone,
        MapPin,
        Pencil,
        Trash2,
    } from "@lucide/svelte";

    import LoadingSection from "$lib/components/ui/LoadingSection.svelte";
    import ErrorSection from "$lib/components/ui/ErrorSection.svelte";
    import BulkActionToolbar from "$lib/components/ui/BulkActionToolbar.svelte";
    import { handleDelete } from "$lib/hooks/handleDelete.svelte";
    import EmptyState from "$lib/components/ui/EmptyState.svelte";

    let itemsPromise = $state<Promise<Contact[]>>(listContacts());
    let resolvedItems = $state<Contact[]>([]);
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
    function selectAll(items: Contact[]) {
        selectedIds = new Set(
            items.map((item) => item.id).filter((id): id is string => !!id),
        );
    }

    function deselectAll() {
        selectedIds = new Set();
    }

    $effect(() => {
        itemsPromise
            .then((items) => {
                resolvedItems = items;
            })
            .catch(() => {});
    });
</script>

<div class="container mx-auto px-4 py-8">
    <div class="max-w-4xl mx-auto">
        <Breadcrumb feature="contacts" />
        <div class="bg-white shadow rounded-lg p-6">
            <div
                class="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4"
            >
                <h1 class="text-3xl font-bold flex-shrink-0">Contacts</h1>
                <div class="flex-1 flex justify-end w-full md:w-auto">
                    <BulkActionToolbar
                        selectedCount={selectedIds.size}
                        totalCount={resolvedItems.length}
                        onSelectAll={() => selectAll(resolvedItems)}
                        onDeselectAll={deselectAll}
                        onDelete={async () => {
                            await handleDelete({
                                ids: [...selectedIds],
                                deleteFn: async (ids) =>
                                    deleteExistingContact(ids),
                                itemName: "contact",
                            });
                            deselectAll();
                            itemsPromise = listContacts();
                        }}
                        newItemHref="/contacts/new"
                        newItemLabel="+ New Contact"
                    />
                </div>
            </div>

            {#await itemsPromise}
                <LoadingSection message="Loading contacts..." />
            {:then items}
                <div class="grid gap-4">
                    {#if items.length === 0}
                        <EmptyState
                            icon={UserIcon}
                            title="No Contacts"
                            description="Get started by creating your first contact"
                            actionLabel="Create Your First Contact"
                            actionHref="/contacts/new"
                        />
                    {:else}
                        {#each items as contact (contact.id)}
                            <div
                                class="bg-white shadow rounded-lg p-6 flex flex-col sm:flex-row items-start gap-4 transition-shadow"
                            >
                                <input
                                    type="checkbox"
                                    checked={isSelected(contact.id!)}
                                    onchange={() =>
                                        toggleSelection(contact.id!)}
                                    class="mt-1 w-4 h-4 text-blue-600 rounded"
                                />
                                <div class="flex-1 min-w-0">
                                    <div class="flex items-start gap-3 mb-2">
                                        <div
                                            class="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 flex-shrink-0"
                                        >
                                            <UserIcon size={20} />
                                        </div>
                                        <div class="min-w-0 flex-1">
                                            <h2
                                                class="text-xl font-semibold break-words"
                                            >
                                                <a
                                                    href={`/contacts/${contact.id}/view`}
                                                    class="hover:underline text-blue-600"
                                                >
                                                    {contact.displayName ||
                                                        `${contact.givenName || ""} ${contact.familyName || ""}` ||
                                                        "Unnamed Contact"}
                                                </a>
                                            </h2>
                                            <p class="text-sm text-gray-500">
                                                {contact.honorificPrefix || ""}
                                                {contact.honorificSuffix || ""}
                                            </p>
                                        </div>
                                    </div>

                                    <div
                                        class="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4"
                                    >
                                        {#if contact.emails && contact.emails.length > 0}
                                            <div class="flex items-start gap-2">
                                                <Mail
                                                    size={16}
                                                    class="text-gray-400 mt-1"
                                                />
                                                <div class="flex flex-col">
                                                    {#each contact.emails as email}
                                                        <span
                                                            class="text-sm text-gray-700"
                                                            >{email.value}
                                                            <span
                                                                class="text-xs text-gray-400"
                                                                >({email.type})</span
                                                            ></span
                                                        >
                                                    {/each}
                                                </div>
                                            </div>
                                        {/if}

                                        {#if contact.phones && contact.phones.length > 0}
                                            <div class="flex items-start gap-2">
                                                <Phone
                                                    size={16}
                                                    class="text-gray-400 mt-1"
                                                />
                                                <div class="flex flex-col">
                                                    {#each contact.phones as phone}
                                                        <span
                                                            class="text-sm text-gray-700"
                                                            >{phone.value}
                                                            <span
                                                                class="text-xs text-gray-400"
                                                                >({phone.type})</span
                                                            ></span
                                                        >
                                                    {/each}
                                                </div>
                                            </div>
                                        {/if}
                                    </div>

                                    {#if contact.addresses && contact.addresses.length > 0}
                                        <div
                                            class="flex items-start gap-2 mt-4"
                                        >
                                            <MapPin
                                                size={16}
                                                class="text-gray-400 mt-1"
                                            />
                                            <div class="flex flex-col">
                                                {#each contact.addresses as addr}
                                                    <span
                                                        class="text-sm text-gray-700"
                                                    >
                                                        {addr.street}
                                                        {addr.houseNumber}, {addr.zip}
                                                        {addr.city}
                                                    </span>
                                                {/each}
                                            </div>
                                        </div>
                                    {/if}
                                </div>

                                <div class="flex flex-col gap-2 shrink-0">
                                    <Button
                                        href={`/contacts/${contact.id}`}
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
                                            const success = await handleDelete({
                                                ids: [contact.id!],
                                                deleteFn: async (id) =>
                                                    deleteExistingContact(id),

                                                itemName: "contact",
                                            });
                                            if (success) {
                                                deselectAll();
                                                itemsPromise = listContacts();
                                            }
                                        }}
                                    >
                                        <Trash2 size={16} /> Delete
                                    </AsyncButton>
                                </div>
                            </div>
                        {/each}
                    {/if}
                </div>
            {:catch error}
                <ErrorSection
                    headline="Failed to load contacts"
                    message={error?.message || "An unexpected error occurred."}
                    href="/contacts"
                    button="Retry"
                />
            {/await}
        </div>
    </div>
</div>
