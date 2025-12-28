<script lang="ts">
    import {
        Plus,
        Trash2,
        Mail,
        Phone,
        MapPin,
        Tag as TagIcon,
        Link as LinkIcon,
        User,
        Search,
    } from "@lucide/svelte";

    import { listContacts } from "../../../routes/contacts/list.remote";
    import { toast } from "svelte-sonner";

    import Button from "../ui/button/button.svelte";
    import AsyncButton from "../ui/AsyncButton.svelte";

    /**
     * A simplified contact form for use in ContactManager (Quick Create / Edit)
     * Uses programmatic submission instead of form enhancement to avoid
     * conflicts when embedded in other forms.
     */
    interface Props {
        initialData?: any;
        onsubmit: (data: any) => Promise<void>;
        loading?: boolean;
        cancelHref?: string;
    }

    let {
        initialData = {
            contact: {},
            emails: [],
            phones: [],
            addresses: [],
            relations: [],
            tags: [],
        },
        onsubmit,
        loading = false,
        cancelHref = "#",
    }: Props = $props();

    // svelte-ignore state_referenced_locally
    const isNew = !initialData.contact?.id;

    // Local state
    // svelte-ignore state_referenced_locally
    let contact = $state({
        displayName: initialData.contact?.displayName ?? "",
        givenName: initialData.contact?.givenName ?? "",
        familyName: initialData.contact?.familyName ?? "",
        birthday: initialData.contact?.birthday
            ? initialData.contact.birthday.split("T")[0]
            : "",
        notes: initialData.contact?.notes ?? "",
        isPublic: initialData.contact?.isPublic ?? false,
    });

    // svelte-ignore state_referenced_locally
    let emails = $state([...(initialData.emails || [])]);
    // svelte-ignore state_referenced_locally
    let phones = $state([...(initialData.phones || [])]);
    // svelte-ignore state_referenced_locally
    let addresses = $state([...(initialData.addresses || [])]);
    // svelte-ignore state_referenced_locally
    let relations = $state([...(initialData.relations || [])]);
    // svelte-ignore state_referenced_locally
    let tagsInput = $state(
        (initialData.tags || []).map((t: any) => t.name).join(", ") ||
            (isNew ? "Customer" : ""),
    );

    // Relations search state
    let contactSearch = $state("");
    let allContacts = $state<any[]>([]);
    let filteredContacts = $derived(
        contactSearch.length > 1
            ? allContacts.filter(
                  (c) =>
                      c.id !== initialData.contact?.id &&
                      (c.displayName
                          ?.toLowerCase()
                          .includes(contactSearch.toLowerCase()) ||
                          c.givenName
                              ?.toLowerCase()
                              .includes(contactSearch.toLowerCase()) ||
                          c.familyName
                              ?.toLowerCase()
                              .includes(contactSearch.toLowerCase()) ||
                          (c.email &&
                              c.email
                                  .toLowerCase()
                                  .includes(contactSearch.toLowerCase()))),
              )
            : [],
    );

    let submitting = $state(false);

    $effect(() => {
        listContacts().then((res) => {
            allContacts = res || [];
        });
    });

    function addEmail() {
        emails = [...emails, { value: "", type: "work", primary: false }];
    }
    function removeEmail(index: number) {
        emails = emails.filter((_, i) => i !== index);
    }

    function addPhone() {
        phones = [...phones, { value: "", type: "mobile", primary: false }];
    }
    function removePhone(index: number) {
        phones = phones.filter((_, i) => i !== index);
    }

    function addAddress() {
        addresses = [
            ...addresses,
            { street: "", city: "", type: "other", primary: false },
        ];
    }
    function removeAddress(index: number) {
        addresses = addresses.filter((_, i) => i !== index);
    }

    function addRelation(targetContact: any) {
        if (relations.find((r) => r.targetContactId === targetContact.id))
            return;
        relations = [
            ...relations,
            {
                targetContactId: targetContact.id,
                relationType: "cooperates with",
                targetContact,
            },
        ];
        contactSearch = "";
    }

    function removeRelation(index: number) {
        relations = relations.filter((_, i) => i !== index);
    }

    async function handleSubmit(e: Event) {
        e.preventDefault();

        if (!contact.displayName) {
            toast.error("Display Name is required");
            return;
        }

        const data = {
            contact: {
                ...contact,
                birthday: contact.birthday || undefined,
            },
            emails: emails.filter((e) => e.value),
            phones: phones.filter((p) => p.value),
            addresses: addresses.filter((a) => a.street || a.city),
            relationIds: relations.map((r) => ({
                targetContactId: r.targetContactId,
                relationType: r.relationType,
            })),
            tagNames: tagsInput
                .split(",")
                .map((t: string) => t.trim())
                .filter(Boolean),
        };

        submitting = true;
        try {
            await onsubmit(data);
        } finally {
            submitting = false;
        }
    }
</script>

<form onsubmit={handleSubmit} class="space-y-6">
    <div class="space-y-4">
        <h3 class="text-lg font-medium flex items-center gap-2">
            <User size={20} class="text-blue-500" />
            Basic Information
        </h3>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
                <label
                    for="displayName"
                    class="block text-sm font-medium text-gray-700"
                    >Display Name <span class="text-red-500">*</span></label
                >
                <input
                    type="text"
                    id="displayName"
                    bind:value={contact.displayName}
                    class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                />
            </div>
            <div>
                <label
                    for="givenName"
                    class="block text-sm font-medium text-gray-700"
                    >Given Name</label
                >
                <input
                    type="text"
                    id="givenName"
                    bind:value={contact.givenName}
                    class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
            </div>
            <div>
                <label
                    for="familyName"
                    class="block text-sm font-medium text-gray-700"
                    >Family Name</label
                >
                <input
                    type="text"
                    id="familyName"
                    bind:value={contact.familyName}
                    class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
            </div>
            <div>
                <label
                    for="birthday"
                    class="block text-sm font-medium text-gray-700"
                    >Birthday</label
                >
                <input
                    type="date"
                    id="birthday"
                    bind:value={contact.birthday}
                    class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
            </div>
        </div>
        <div>
            <label for="notes" class="block text-sm font-medium text-gray-700"
                >Notes</label
            >
            <textarea
                id="notes"
                bind:value={contact.notes}
                rows="2"
                class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            ></textarea>
        </div>

        <div class="flex items-center gap-2 pt-2">
            <input
                type="checkbox"
                id="isPublic"
                bind:checked={contact.isPublic}
                class="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
            />
            <label for="isPublic" class="text-sm font-medium text-gray-700">
                Public Profile
            </label>
        </div>

        <div>
            <label
                for="tags"
                class="block text-sm font-medium text-gray-700 flex items-center gap-2"
            >
                <TagIcon size={16} class="text-indigo-500" />
                Tags (comma separated)
            </label>
            <input
                type="text"
                id="tags"
                bind:value={tagsInput}
                placeholder="e.g. Customer, Lead, Priority"
                class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
        </div>
    </div>

    <!-- Emails Section -->
    <div class="space-y-3">
        <div class="flex justify-between items-center">
            <h3 class="text-sm font-medium flex items-center gap-2">
                <Mail size={16} class="text-green-500" />
                Email Addresses
            </h3>
            <Button
                type="button"
                variant="outline"
                size="sm"
                onclick={addEmail}
            >
                <Plus size={14} class="mr-1" /> Add
            </Button>
        </div>
        {#each emails as email, i}
            <div class="flex gap-2 items-center">
                <input
                    type="email"
                    placeholder="Email Address"
                    bind:value={email.value}
                    class="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm"
                />
                <select
                    bind:value={email.type}
                    class="w-24 px-2 py-2 border border-gray-300 rounded-md text-sm"
                >
                    <option value="home">Home</option>
                    <option value="work">Work</option>
                    <option value="other">Other</option>
                </select>
                <button
                    type="button"
                    class="text-red-500 hover:text-red-700"
                    onclick={() => removeEmail(i)}
                >
                    <Trash2 size={16} />
                </button>
            </div>
        {/each}
    </div>

    <!-- Phones Section -->
    <div class="space-y-3">
        <div class="flex justify-between items-center">
            <h3 class="text-sm font-medium flex items-center gap-2">
                <Phone size={16} class="text-purple-500" />
                Phone Numbers
            </h3>
            <Button
                type="button"
                variant="outline"
                size="sm"
                onclick={addPhone}
            >
                <Plus size={14} class="mr-1" /> Add
            </Button>
        </div>
        {#each phones as phone, i}
            <div class="flex gap-2 items-center">
                <input
                    type="text"
                    placeholder="Phone Number"
                    bind:value={phone.value}
                    class="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm"
                />
                <select
                    bind:value={phone.type}
                    class="w-24 px-2 py-2 border border-gray-300 rounded-md text-sm"
                >
                    <option value="mobile">Mobile</option>
                    <option value="home">Home</option>
                    <option value="work">Work</option>
                    <option value="other">Other</option>
                </select>
                <button
                    type="button"
                    class="text-red-500 hover:text-red-700"
                    onclick={() => removePhone(i)}
                >
                    <Trash2 size={16} />
                </button>
            </div>
        {/each}
    </div>

    <!-- Addresses Section -->
    <div class="space-y-3">
        <div class="flex justify-between items-center">
            <h3 class="text-sm font-medium flex items-center gap-2">
                <MapPin size={16} class="text-red-500" />
                Physical Addresses
            </h3>
            <Button
                type="button"
                variant="outline"
                size="sm"
                onclick={addAddress}
            >
                <Plus size={14} class="mr-1" /> Add
            </Button>
        </div>
        {#each addresses as addr, i}
            <div
                class="p-3 border border-gray-200 rounded-lg space-y-2 bg-gray-50 relative"
            >
                <button
                    type="button"
                    class="absolute top-2 right-2 text-red-500 hover:text-red-700"
                    onclick={() => removeAddress(i)}
                >
                    <Trash2 size={14} />
                </button>
                <div class="grid grid-cols-2 gap-2">
                    <input
                        type="text"
                        placeholder="Street"
                        bind:value={addr.street}
                        class="px-2 py-1 border border-gray-300 rounded text-sm"
                    />
                    <input
                        type="text"
                        placeholder="House No."
                        bind:value={addr.houseNumber}
                        class="px-2 py-1 border border-gray-300 rounded text-sm"
                    />
                    <input
                        type="text"
                        placeholder="ZIP"
                        bind:value={addr.zip}
                        class="px-2 py-1 border border-gray-300 rounded text-sm"
                    />
                    <input
                        type="text"
                        placeholder="City"
                        bind:value={addr.city}
                        class="px-2 py-1 border border-gray-300 rounded text-sm"
                    />
                    <input
                        type="text"
                        placeholder="Country"
                        bind:value={addr.country}
                        class="px-2 py-1 border border-gray-300 rounded text-sm"
                    />
                    <select
                        bind:value={addr.type}
                        class="px-2 py-1 border border-gray-300 rounded text-sm"
                    >
                        <option value="home">Home</option>
                        <option value="work">Work</option>
                        <option value="other">Other</option>
                    </select>
                </div>
            </div>
        {/each}
    </div>

    <div class="flex justify-end gap-3 pt-4 border-t">
        <Button href={cancelHref} variant="secondary" type="button" size="sm">
            Cancel
        </Button>
        <AsyncButton
            type="submit"
            loading={submitting || loading}
            loadingLabel="Saving..."
            size="sm"
        >
            Save Contact
        </AsyncButton>
    </div>
</form>
