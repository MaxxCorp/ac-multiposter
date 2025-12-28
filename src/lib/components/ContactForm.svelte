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
    import { goto } from "$app/navigation";
    import { listContacts } from "../../routes/contacts/list.remote";
    import { toast } from "svelte-sonner";

    import Button from "./ui/button/button.svelte";
    import AsyncButton from "./ui/AsyncButton.svelte";

    interface Props {
        initialData?: any;
        remoteFunction: any;
        schema: any;
        onSuccess?: (result: any) => void;
        cancelHref?: string;
        // For update forms, we need the ID
        contactId?: string;
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
        remoteFunction,
        schema,
        onSuccess,
        cancelHref = "/contacts",
        contactId,
    }: Props = $props();

    // svelte-ignore state_referenced_locally
    const isNew = !contactId;

    // Local state for arrays that aren't directly bound to form fields
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
                      c.id !== contactId &&
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

    // Compute the enhance attributes
    // For create: schema expects { contact: {...}, emails: [...], ... }
    // For update: schema expects { id: string, data: { contact: {...}, ... } }
    const enhanceAttr = $derived.by(() => {
        if (!remoteFunction || !schema) return {};

        return remoteFunction
            .preflight(schema)
            .enhance(async ({ submit }: any) => {
                try {
                    // Prepare array data that isn't captured by form fields
                    const arrayData = {
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

                    const result: any = await submit(arrayData);

                    if (result?.error) {
                        toast.error(
                            result.error.message ||
                                "Oh no! Something went wrong",
                        );
                        return;
                    }
                    toast.success("Successfully saved!");
                    if (onSuccess) {
                        onSuccess(result);
                    } else {
                        goto("/contacts");
                    }
                } catch (error: unknown) {
                    const err = error as { message?: string };
                    toast.error(err?.message || "Oh no! Something went wrong");
                }
            });
    });

    // Helper to get field bindings - handles both create and update schemas
    function getContactField(fieldName: string) {
        // For create: fields.contact.displayName
        // For update: fields.data.contact.displayName
        if (isNew) {
            return remoteFunction?.fields?.contact?.[fieldName];
        } else {
            return remoteFunction?.fields?.data?.contact?.[fieldName];
        }
    }

    // Get issues for a contact field
    const getIssues = (fieldName: string) => {
        const field = getContactField(fieldName);
        return field?.issues?.() ?? [];
    };

    // Initial birthday value
    const initialBirthday = initialData.contact?.birthday
        ? initialData.contact.birthday.split("T")[0]
        : "";
</script>

<form {...enhanceAttr} class="space-y-8">
    <!-- Hidden ID field for updates -->
    {#if !isNew && contactId}
        <input {...remoteFunction.fields.id.as("hidden", contactId)} />
    {/if}

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
                {#if isNew}
                    <input
                        {...remoteFunction.fields.contact.displayName.as(
                            "text",
                        )}
                        id="displayName"
                        value={remoteFunction.fields.contact.displayName.value() ??
                            initialData.contact?.displayName ??
                            ""}
                        class="mt-1 block w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 {getIssues(
                            'displayName',
                        ).length > 0
                            ? 'border-red-500 ring-1 ring-red-500'
                            : 'border-gray-300'}"
                        onblur={() => remoteFunction.validate()}
                    />
                {:else}
                    <input
                        {...remoteFunction.fields.data.contact.displayName.as(
                            "text",
                        )}
                        id="displayName"
                        value={remoteFunction.fields.data.contact.displayName.value() ??
                            initialData.contact?.displayName ??
                            ""}
                        class="mt-1 block w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 {getIssues(
                            'displayName',
                        ).length > 0
                            ? 'border-red-500 ring-1 ring-red-500'
                            : 'border-gray-300'}"
                        onblur={() => remoteFunction.validate()}
                    />
                {/if}
                {#each getIssues("displayName") as issue}
                    <p class="mt-1 text-xs text-red-600">{issue.message}</p>
                {/each}
            </div>
            <div>
                <label
                    for="givenName"
                    class="block text-sm font-medium text-gray-700"
                    >Given Name</label
                >
                {#if isNew}
                    <input
                        {...remoteFunction.fields.contact.givenName.as("text")}
                        id="givenName"
                        value={remoteFunction.fields.contact.givenName.value() ??
                            initialData.contact?.givenName ??
                            ""}
                        class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                {:else}
                    <input
                        {...remoteFunction.fields.data.contact.givenName.as(
                            "text",
                        )}
                        id="givenName"
                        value={remoteFunction.fields.data.contact.givenName.value() ??
                            initialData.contact?.givenName ??
                            ""}
                        class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                {/if}
            </div>
            <div>
                <label
                    for="familyName"
                    class="block text-sm font-medium text-gray-700"
                    >Family Name</label
                >
                {#if isNew}
                    <input
                        {...remoteFunction.fields.contact.familyName.as("text")}
                        id="familyName"
                        value={remoteFunction.fields.contact.familyName.value() ??
                            initialData.contact?.familyName ??
                            ""}
                        class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                {:else}
                    <input
                        {...remoteFunction.fields.data.contact.familyName.as(
                            "text",
                        )}
                        id="familyName"
                        value={remoteFunction.fields.data.contact.familyName.value() ??
                            initialData.contact?.familyName ??
                            ""}
                        class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                {/if}
            </div>
            <div>
                <label
                    for="birthday"
                    class="block text-sm font-medium text-gray-700"
                    >Birthday</label
                >
                {#if isNew}
                    <input
                        {...remoteFunction.fields.contact.birthday.as("date")}
                        id="birthday"
                        value={remoteFunction.fields.contact.birthday.value() ??
                            initialBirthday}
                        class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                {:else}
                    <input
                        {...remoteFunction.fields.data.contact.birthday.as(
                            "date",
                        )}
                        id="birthday"
                        value={remoteFunction.fields.data.contact.birthday.value() ??
                            initialBirthday}
                        class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                {/if}
            </div>
        </div>
        <div>
            <label for="notes" class="block text-sm font-medium text-gray-700"
                >Notes</label
            >
            {#if isNew}
                <textarea
                    {...remoteFunction.fields.contact.notes.as("text")}
                    id="notes"
                    value={remoteFunction.fields.contact.notes.value() ??
                        initialData.contact?.notes ??
                        ""}
                    rows="3"
                    class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                ></textarea>
            {:else}
                <textarea
                    {...remoteFunction.fields.data.contact.notes.as("text")}
                    id="notes"
                    value={remoteFunction.fields.data.contact.notes.value() ??
                        initialData.contact?.notes ??
                        ""}
                    rows="3"
                    class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                ></textarea>
            {/if}
        </div>

        <div class="flex items-center gap-2 pt-2">
            {#if isNew}
                <input
                    {...remoteFunction.fields.contact.isPublic.as("checkbox")}
                    id="isPublic"
                    checked={remoteFunction.fields.contact.isPublic.value() ??
                        initialData.contact?.isPublic ??
                        false}
                    class="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                />
            {:else}
                <input
                    {...remoteFunction.fields.data.contact.isPublic.as(
                        "checkbox",
                    )}
                    id="isPublic"
                    checked={remoteFunction.fields.data.contact.isPublic.value() ??
                        initialData.contact?.isPublic ??
                        false}
                    class="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                />
            {/if}
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
        <AsyncButton
            type="submit"
            loading={remoteFunction.pending}
            loadingLabel="Saving..."
        >
            Save Contact
        </AsyncButton>
    </div>
</form>
