<script lang="ts">
    import { onMount } from "svelte";
    import {
        Search,
        User,
        Plus,
        Check,
        ExternalLink,
        Pencil,
        X,
    } from "@lucide/svelte";

    import Button from "../ui/button/button.svelte";
    import { listContacts } from "../../../routes/contacts/list.remote";
    import { type Contact } from "$lib/validations/contacts";
    import {
        addAssociation,
        removeAssociation,
        fetchEntityContacts,
        updateAssociationStatus as updateAssociationStatusRemote,
    } from "../../../routes/contacts/associate.remote";
    import ContactForm from "./ContactForm.svelte";

    import { createNewContact } from "../../../routes/contacts/new/create.remote";
    import { updateExistingContact } from "../../../routes/contacts/[id]/update.remote";
    import { toast } from "svelte-sonner";

    let { type, entityId = null, onchange = null } = $props();

    let associatedContacts = $state<Contact[]>([]);
    let allContacts = $state<Contact[]>([]);
    let showSelector = $state(false);
    let showQuickCreate = $state(false);
    let searchQuery = $state("");
    let loadingSearch = $state(false);
    let editingContact = $state<Contact | null>(null);

    onMount(async () => {
        if (entityId) {
            associatedContacts = await (fetchEntityContacts as any)({
                type,
                entityId,
            });
        }
    });

    async function toggleSelector() {
        showSelector = !showSelector;
        if (showSelector && allContacts.length === 0) {
            loadingSearch = true;
            allContacts = await (listContacts as any)();
            loadingSearch = false;
        }
    }

    const filteredContacts = $derived(
        allContacts.filter((c) => {
            const name = (
                c.displayName || `${c.givenName || ""} ${c.familyName || ""}`
            ).toLowerCase();
            return name.includes(searchQuery.toLowerCase());
        }),
    );

    async function toggleAssociation(contact: Contact) {
        const isAssociated = associatedContacts.some(
            (ac) => ac.id === contact.id,
        );
        try {
            if (isAssociated) {
                if (entityId) {
                    await (removeAssociation as any)({
                        type,
                        entityId,
                        contactId: contact.id,
                    });
                }
                associatedContacts = associatedContacts.filter(
                    (ac) => ac.id !== contact.id,
                );
            } else {
                if (entityId) {
                    await (addAssociation as any)({
                        type,
                        entityId,
                        contactId: contact.id,
                    });
                }
                associatedContacts = [...associatedContacts, contact];
            }
            if (onchange) onchange(associatedContacts.map((c) => c.id));
        } catch (error: any) {
            toast.error(error.message || "Failed to update association");
        }
    }

    async function handleQuickCreateSuccess(result: any) {
        if (result.id) {
            if (entityId) {
                // Automatically associate the new contact
                // Note: Ideally this should be handled by the server action if we pass context,
                // but for now we do it here.
                await (addAssociation as any)({
                    type,
                    entityId,
                    contactId: result.id,
                });
            }
            const newContact = (await (listContacts as any)()).find(
                (c: Contact) => c.id === result.id,
            );
            if (newContact) {
                associatedContacts = [...associatedContacts, newContact];
                allContacts = [newContact, ...allContacts];
                if (onchange) onchange(associatedContacts.map((c) => c.id));
            }
            showQuickCreate = false;
            toast.success("Contact created and associated");
        }
    }

    async function handleInPlaceUpdateSuccess(result: any) {
        if (!editingContact) return;
        const targetId = editingContact.id;

        // Refresh local state
        const updatedContact = (await (listContacts as any)()).find(
            (c: Contact) => c.id === targetId,
        );
        if (updatedContact) {
            associatedContacts = associatedContacts.map((ac) =>
                ac.id === updatedContact.id ? updatedContact : ac,
            );
            allContacts = allContacts.map((c) =>
                c.id === updatedContact.id ? updatedContact : c,
            );
        }

        editingContact = null;
        toast.success("Contact updated");
    }

    async function updateStatus(contact: Contact, status: string) {
        try {
            if (entityId) {
                await (updateAssociationStatusRemote as any)({
                    type,
                    entityId,
                    contactId: contact.id,
                    status,
                });
            }
            associatedContacts = associatedContacts.map((ac) =>
                ac.id === contact.id
                    ? { ...ac, participationStatus: status }
                    : ac,
            );
        } catch (error: any) {
            console.error("Failed to update status:", error);
            toast.error(error.message || "Failed to update status");
        }
    }
</script>

<div class="space-y-4 border rounded-lg p-4 bg-gray-50">
    <div
        class="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2"
    >
        <h3
            class="text-sm font-semibold text-gray-700 uppercase tracking-wider flex items-center gap-2"
        >
            <User size={16} />
            Associated Contacts
        </h3>
        <div class="flex gap-2 flex-wrap">
            <Button
                type="button"
                variant="outline"
                size="sm"
                onclick={toggleSelector}
            >
                {showSelector ? "Close Search" : "Link Contact"}
            </Button>
            <Button
                type="button"
                variant="outline"
                size="sm"
                onclick={() => (showQuickCreate = !showQuickCreate)}
            >
                <Plus size={16} class="mr-1" /> Quick Create
            </Button>
        </div>
    </div>

    {#if associatedContacts.length > 0}
        <div class="flex flex-wrap gap-2">
            {#each associatedContacts as contact}
                <div
                    class="flex items-center gap-2 bg-white border rounded-full px-3 py-1 text-sm shadow-sm group flex-wrap"
                >
                    <a
                        href="/contacts/{contact.id}"
                        class="text-gray-700 hover:text-blue-600 flex items-center gap-1"
                        title="View contact"
                    >
                        {contact.displayName || contact.givenName || "Unnamed"}
                        <ExternalLink
                            size={12}
                            class="opacity-0 group-hover:opacity-100 transition-opacity"
                        />
                    </a>

                    {#if type === "event"}
                        <select
                            value={contact.participationStatus || "needsAction"}
                            onchange={(e) =>
                                updateStatus(contact, e.currentTarget.value)}
                            class="text-xs bg-transparent border-0 focus:ring-0 cursor-pointer text-gray-500 hover:text-blue-600 font-medium"
                        >
                            <option value="needsAction">Needs Action</option>
                            <option value="accepted">Accepted</option>
                            <option value="declined">Declined</option>
                            <option value="tentative">Tentative</option>
                        </select>
                    {/if}

                    <div class="flex items-center border-l pl-2 ml-1 gap-1">
                        <button
                            type="button"
                            class="text-gray-400 hover:text-blue-500 transition-colors"
                            onclick={() => {
                                editingContact = contact;
                                showQuickCreate = false;
                                showSelector = false;
                            }}
                            title="Edit in place"
                        >
                            <Pencil size={12} />
                        </button>
                        <button
                            type="button"
                            class="text-gray-400 hover:text-red-500 transition-colors"
                            onclick={() => toggleAssociation(contact)}
                            title="Remove link"
                        >
                            <X size={14} />
                        </button>
                    </div>
                </div>
            {/each}
        </div>
    {:else if !showSelector && !showQuickCreate}
        <p class="text-sm text-gray-500 italic">No contacts associated yet.</p>
    {/if}

    {#if showSelector}
        <div class="bg-white border rounded-lg p-3 shadow-inner space-y-3">
            <div class="relative">
                <Search
                    size={16}
                    class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                />
                <input
                    type="text"
                    placeholder="Search contacts..."
                    bind:value={searchQuery}
                    class="pl-9 w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
            </div>

            <div class="max-h-48 overflow-y-auto space-y-1">
                {#if loadingSearch}
                    <div class="text-xs text-center py-4 text-gray-400">
                        Loading contacts...
                    </div>
                {:else if filteredContacts.length === 0}
                    <div class="text-xs text-center py-4 text-gray-400">
                        No contacts found.
                    </div>
                {:else}
                    {#each filteredContacts as contact}
                        {@const isAssociated = associatedContacts.some(
                            (ac) => ac.id === contact.id,
                        )}
                        <button
                            type="button"
                            class="w-full flex items-center justify-between px-3 py-2 rounded-md transition-colors {isAssociated
                                ? 'bg-blue-50 text-blue-700'
                                : 'hover:bg-gray-100'}"
                            onclick={() => toggleAssociation(contact)}
                        >
                            <span class="text-sm"
                                >{contact.displayName ||
                                    `${contact.givenName || ""} ${contact.familyName || ""}`}</span
                            >
                            {#if isAssociated}
                                <Check size={14} />
                            {/if}
                        </button>
                    {/each}
                {/if}
            </div>
        </div>
    {/if}

    {#if showQuickCreate || editingContact}
        <div
            class="bg-white border rounded-lg p-4 shadow-lg animate-in fade-in slide-in-from-top-2"
        >
            <div class="flex justify-between items-center mb-4">
                <h4 class="font-bold text-gray-900">
                    {editingContact
                        ? `Edit ${editingContact.displayName || "Contact"}`
                        : "Quick Create Contact"}
                </h4>
                <button
                    type="button"
                    onclick={() => {
                        showQuickCreate = false;
                        editingContact = null;
                    }}
                >
                    <X size={20} class="text-gray-400 hover:text-gray-600" />
                </button>
            </div>

            {#if editingContact}
                <ContactForm
                    remoteFunction={updateExistingContact}
                    initialData={{
                        contact: editingContact,
                        emails: editingContact.emails,
                        phones: editingContact.phones,
                        addresses: editingContact.addresses,
                        relations: editingContact.relations,
                        tags: editingContact.tags,
                    }}
                    contactId={editingContact.id}
                    onSuccess={handleInPlaceUpdateSuccess}
                    cancelHref="#"
                />
            {:else}
                <ContactForm
                    remoteFunction={createNewContact}
                    onSuccess={handleQuickCreateSuccess}
                    cancelHref="#"
                />
            {/if}
        </div>
    {/if}
</div>
