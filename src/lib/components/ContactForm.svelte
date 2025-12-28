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

    import { listContacts } from "../../routes/contacts/list.remote";

    import Button from "./ui/button/button.svelte";
    import AsyncButton from "./ui/AsyncButton.svelte";

    interface Props {
        initialData?: any;
        onsubmit?: (data: any) => Promise<void>;
        remoteFunction?: any;
        preflightSchema?: any;
        onSuccess?: (result: any) => void;
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
        remoteFunction,
        preflightSchema,
        onSuccess,
        loading = false,
        cancelHref = "/contacts",
    }: Props = $props();

    function prepareData() {
        // Convert null values to undefined to satisfy zod/mini optional schemas
        const cleanedContact = Object.fromEntries(
            Object.entries(contact).map(([k, v]) => [
                k,
                v === null ? undefined : v,
            ]),
        );

        return {
            contact: cleanedContact,
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
    }

    // Remove separate enhanceAttr and rely on manual submission due to library behavior

    // svelte-ignore state_referenced_locally
    const isNew = !initialData.contact.id;

    // Determine the path to the display name field issues based on the schema structure
    // createNewContact uses { contact: { displayName: ... } }
    // updateExistingContact uses { data: { contact: { displayName: ... } } }
    const displayNameIssues = $derived.by(() => {
        if (!remoteFunction) return [];
        try {
            // Try both common structures
            return (
                remoteFunction.fields?.contact?.displayName?.issues() ||
                remoteFunction.fields?.data?.contact?.displayName?.issues() ||
                []
            );
        } catch (e) {
            return [];
        }
    });

    function validateField() {
        if (remoteFunction?.validate) {
            // Construct payload for validation - heuristic matching handleSubmit
            const data = prepareData();
            let payload: any = data;
            if (!isNew && initialData.contact.id) {
                payload = { id: initialData.contact.id, data };
            }
            remoteFunction.validate(payload);
        }
    }

    // svelte-ignore state_referenced_locally
    let contact: any = $state({
        isPublic: false,
        ...initialData.contact,
        birthday: initialData.contact.birthday
            ? initialData.contact.birthday.split("T")[0]
            : "",
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
                      c.id !== contact.id &&
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

    $effect(() => {
        listContacts().then((res) => {
            allContacts = res || [];
        });
    });

    // Do not pre-fill empty items if they are empty, as requested

    function addEmail() {
        emails.push({ value: "", type: "work", primary: false });
    }
    function removeEmail(index: number) {
        emails.splice(index, 1);
    }

    function addPhone() {
        phones.push({ value: "", type: "mobile", primary: false });
    }
    function removePhone(index: number) {
        phones.splice(index, 1);
    }

    function addAddress() {
        addresses.push({ street: "", city: "", type: "other", primary: false });
    }
    function removeAddress(index: number) {
        addresses.splice(index, 1);
    }

    function addRelation(targetContact: any) {
        if (relations.find((r) => r.targetContactId === targetContact.id))
            return;
        relations.push({
            targetContactId: targetContact.id,
            relationType: "cooperates with",
            targetContact,
        });
        contactSearch = "";
    }

    function removeRelation(index: number) {
        relations.splice(index, 1);
    }

    async function handleSubmit(e: Event) {
        e.preventDefault();

        const data = prepareData();

        // Construct payload
        let payload: any = data;
        if (!isNew && initialData.contact.id) {
            payload = { id: initialData.contact.id, data };
        }

        // Manual validation if remoteFunction is provided
        if (remoteFunction?.validate) {
            try {
                const isValid = await remoteFunction.validate(payload);
                if (!isValid) return;
            } catch (err) {
                console.error("Validation error:", err);
                return;
            }
        }

        if (onsubmit) {
            await onsubmit(data); // Consumer expects raw data
        } else if (remoteFunction) {
            try {
                // Call remote function programmatically
                const result = await remoteFunction(payload);
                if (onSuccess) onSuccess(result);
            } catch (error) {
                console.error("Submission error:", error);
            }
        }
    }
</script>

<form onsubmit={handleSubmit} class="space-y-8">
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
                    onblur={validateField}
                    class="mt-1 block w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 {displayNameIssues.length >
                    0
                        ? 'border-red-500 ring-1 ring-red-500'
                        : 'border-gray-300'}"
                    required
                />
                {#each displayNameIssues as issue}
                    <p class="mt-1 text-xs text-red-600">{issue.message}</p>
                {/each}
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
                rows="3"
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
                Public Profile (Allow unauthenticated viewing)
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

    <div class="space-y-4">
        <h3 class="text-lg font-medium flex items-center gap-2">
            <LinkIcon size={20} class="text-pink-500" />
            Relations
        </h3>

        <div class="space-y-4">
            <!-- Search for contacts -->
            <div class="relative">
                <div
                    class="flex items-center gap-2 border border-gray-300 rounded-md px-3 py-2 focus-within:ring-2 focus-within:ring-blue-500"
                >
                    <Search size={18} class="text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search for a contact to link..."
                        bind:value={contactSearch}
                        class="flex-1 outline-none"
                    />
                </div>

                {#if filteredContacts.length > 0}
                    <div
                        class="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-y-auto"
                    >
                        {#each filteredContacts as c}
                            <button
                                type="button"
                                class="w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center justify-between"
                                onclick={() => addRelation(c)}
                            >
                                <span
                                    >{c.displayName ||
                                        `${c.givenName || ""} ${c.familyName || ""}`.trim()}</span
                                >
                                <Plus size={14} class="text-gray-400" />
                            </button>
                        {/each}
                    </div>
                {/if}
            </div>

            <!-- List of relations -->
            {#if relations.length > 0}
                <div class="space-y-2">
                    {#each relations as rel, i}
                        <div
                            class="flex items-center gap-2 bg-gray-50 p-2 rounded-md border border-gray-100"
                        >
                            <div class="flex-1 text-sm">
                                <span class="font-medium">
                                    {rel.targetContact?.displayName ||
                                        `${rel.targetContact?.givenName || ""} ${rel.targetContact?.familyName || ""}`.trim()}
                                </span>
                            </div>
                            <div class="w-48">
                                <select
                                    bind:value={rel.relationType}
                                    class="block w-full text-xs px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                                >
                                    <option value="reports to"
                                        >reports to</option
                                    >
                                    <option value="cooperates with"
                                        >cooperates with</option
                                    >
                                    <option value="manager of"
                                        >manager of</option
                                    >
                                    <option value="other">other</option>
                                </select>
                            </div>
                            {#if rel.relationType === "other"}
                                <input
                                    type="text"
                                    placeholder="Type relation..."
                                    class="w-32 text-xs px-2 py-1 border border-gray-300 rounded"
                                    onchange={(e) =>
                                        (rel.relationType = (
                                            e.target as HTMLInputElement
                                        ).value)}
                                />
                            {/if}
                            <button
                                type="button"
                                class="text-red-500 hover:text-red-700"
                                onclick={() => removeRelation(i)}
                            >
                                <Trash2 size={16} />
                            </button>
                        </div>
                    {/each}
                </div>
            {/if}
        </div>
    </div>

    <div class="space-y-4">
        <div class="flex justify-between items-center">
            <h3 class="text-lg font-medium flex items-center gap-2">
                <Mail size={20} class="text-green-500" />
                Email Addresses
            </h3>
            <Button
                type="button"
                variant="outline"
                size="sm"
                onclick={addEmail}
            >
                <Plus size={16} class="mr-1" /> Add Email
            </Button>
        </div>
        {#each emails as email, i}
            <div class="flex gap-2 items-end">
                <div class="flex-1">
                    <input
                        type="email"
                        placeholder="Email Address"
                        bind:value={email.value}
                        class="block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        aria-label={`Email ${i + 1}`}
                    />
                </div>
                <div class="w-32">
                    <select
                        bind:value={email.type}
                        class="block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        aria-label={`Email type ${i + 1}`}
                    >
                        <option value="home">Home</option>
                        <option value="work">Work</option>
                        <option value="other">Other</option>
                    </select>
                </div>
                <label class="flex items-center gap-1 mb-2 cursor-pointer">
                    <input
                        type="checkbox"
                        bind:checked={email.primary}
                        class="rounded text-blue-600"
                    />
                    <span class="text-xs text-gray-500">Primary</span>
                </label>
                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    class="text-red-500 mb-1"
                    onclick={() => removeEmail(i)}
                    aria-label={`Remove email ${i + 1}`}
                >
                    <Trash2 size={16} />
                </Button>
            </div>
        {/each}
    </div>

    <div class="space-y-4">
        <div class="flex justify-between items-center">
            <h3 class="text-lg font-medium flex items-center gap-2">
                <Phone size={20} class="text-purple-500" />
                Phone Numbers
            </h3>
            <Button
                type="button"
                variant="outline"
                size="sm"
                onclick={addPhone}
            >
                <Plus size={16} class="mr-1" /> Add Phone
            </Button>
        </div>
        {#each phones as phone, i}
            <div class="flex gap-2 items-end">
                <div class="flex-1">
                    <input
                        type="text"
                        placeholder="Phone Number"
                        bind:value={phone.value}
                        class="block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        aria-label={`Phone ${i + 1}`}
                    />
                </div>
                <div class="w-32">
                    <select
                        bind:value={phone.type}
                        class="block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        aria-label={`Phone type ${i + 1}`}
                    >
                        <option value="mobile">Mobile</option>
                        <option value="home">Home</option>
                        <option value="work">Work</option>
                        <option value="other">Other</option>
                    </select>
                </div>
                <label class="flex items-center gap-1 mb-2 cursor-pointer">
                    <input
                        type="checkbox"
                        bind:checked={phone.primary}
                        class="rounded text-blue-600"
                    />
                    <span class="text-xs text-gray-500">Primary</span>
                </label>
                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    class="text-red-500 mb-1"
                    onclick={() => removePhone(i)}
                    aria-label={`Remove phone ${i + 1}`}
                >
                    <Trash2 size={16} />
                </Button>
            </div>
        {/each}
    </div>

    <div class="space-y-4">
        <div class="flex justify-between items-center">
            <h3 class="text-lg font-medium flex items-center gap-2">
                <MapPin size={20} class="text-red-500" />
                Physical Addresses
            </h3>
            <Button
                type="button"
                variant="outline"
                size="sm"
                onclick={addAddress}
            >
                <Plus size={16} class="mr-1" /> Add Address
            </Button>
        </div>
        {#each addresses as addr, i}
            <div
                class="p-4 border border-gray-100 rounded-lg space-y-4 bg-gray-50 relative"
            >
                <button
                    type="button"
                    class="absolute top-2 right-2 text-red-500 hover:text-red-700"
                    onclick={() => removeAddress(i)}
                    aria-label={`Remove address ${i + 1}`}
                >
                    <Trash2 size={16} />
                </button>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div class="md:col-span-2">
                        <span
                            class="block text-xs font-medium text-gray-500 uppercase mb-1"
                            >Street & Number</span
                        >
                        <div class="flex gap-2">
                            <input
                                type="text"
                                placeholder="Street"
                                bind:value={addr.street}
                                class="block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                aria-label="Street"
                            />
                            <input
                                type="text"
                                placeholder="No."
                                bind:value={addr.houseNumber}
                                class="w-20 block px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                aria-label="House Number"
                            />
                        </div>
                    </div>
                    <div>
                        <span
                            class="block text-xs font-medium text-gray-500 uppercase mb-1"
                            >ZIP & City</span
                        >
                        <div class="flex gap-2">
                            <input
                                type="text"
                                placeholder="ZIP"
                                bind:value={addr.zip}
                                class="w-24 block px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                aria-label="ZIP Code"
                            />
                            <input
                                type="text"
                                placeholder="City"
                                bind:value={addr.city}
                                class="block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                aria-label="City"
                            />
                        </div>
                    </div>
                    <div>
                        <label
                            for={`country-${i}`}
                            class="block text-xs font-medium text-gray-500 uppercase"
                            >Country</label
                        >
                        <input
                            type="text"
                            id={`country-${i}`}
                            placeholder="Country"
                            bind:value={addr.country}
                            class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                    <div>
                        <label
                            for={`type-${i}`}
                            class="block text-xs font-medium text-gray-500 uppercase"
                            >Type</label
                        >
                        <select
                            id={`type-${i}`}
                            bind:value={addr.type}
                            class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="home">Home</option>
                            <option value="work">Work</option>
                            <option value="other">Other</option>
                        </select>
                    </div>
                </div>
            </div>
        {/each}
    </div>

    <div class="flex justify-end gap-3 pt-6 border-t">
        <Button href={cancelHref} variant="secondary" type="button"
            >Cancel</Button
        >
        <AsyncButton type="submit" {loading} loadingLabel="Saving...">
            Save Contact
        </AsyncButton>
    </div>
</form>
