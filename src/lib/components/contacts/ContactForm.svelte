<script lang="ts">
    import {
        Plus,
        Trash2,
        Mail,
        Phone,
        MapPin,
        Link as LinkIcon,
        User,
        Search,
    } from "@lucide/svelte";
    import { goto } from "$app/navigation";
    import { listContacts } from "../../../routes/contacts/list.remote";
    import { toast } from "svelte-sonner";
    import TagInput from "../ui/TagInput.svelte";

    import Button from "../ui/button/button.svelte";
    import AsyncButton from "../ui/AsyncButton.svelte";

    interface Props {
        initialData?: any;
        remoteFunction?: any; // Optional superforms object
        schema?: any; // Optional

        onSuccess?: (result: any) => void;
        cancelHref?: string;
        contactId?: string;
        loading?: boolean;
    }

    let {
        initialData = {},
        remoteFunction,
        schema,
        onSuccess,
        cancelHref = "/contacts",
        contactId,
        loading = false,
    }: Props = $props();

    // Default values
    const d = (val: any, def: any) =>
        val === undefined || val === null ? def : val;

    // Use derived state for initial values if we want them to react to prop changes,
    // but for a form, usually we want to initialize once.
    // To silence warnings, we can use a rune to track if we've initialized, or just accept that it's initial state.
    // However, for "editing mode", if contactId changes, we might want to reset form.
    // But typically the parent component (page) remounts or handles keying.

    // svelte-ignore state_referenced_locally
    let contactData = $state({
        displayName: d(initialData.contact?.displayName, ""),
        givenName: d(initialData.contact?.givenName, ""),
        familyName: d(initialData.contact?.familyName, ""),
        birthday: d(
            initialData.contact?.birthday
                ? (initialData.contact.birthday instanceof Date
                      ? initialData.contact.birthday.toISOString().split("T")[0]
                      : String(initialData.contact.birthday).split("T")[0])
                : "",
            "",
        ),
        notes: d(initialData.contact?.notes, ""),
        isPublic: d(initialData.contact?.isPublic, false),
    });

    // svelte-ignore state_referenced_locally
    let emails = $state([...d(initialData.emails, [])]);
    // svelte-ignore state_referenced_locally
    let phones = $state([...d(initialData.phones, [])]);
    // svelte-ignore state_referenced_locally
    let addresses = $state([...d(initialData.addresses, [])]);
    // svelte-ignore state_referenced_locally
    let relations = $state([...d(initialData.relations, [])]);
    // svelte-ignore state_referenced_locally
    let tagsInput = $state(
        (initialData.tags || []).map((t: any) => t.name).join(", ") ||
            (!contactId ? "Customer" : ""),
    );

    // Relations search state
    let contactSearch = $state("");
    let allContacts = $state<any[]>([]);

    // Use async derived or a proper resource if possible, or just onMount.
    // With Svelte 5 resources (experimental), but for now standard effect is okay if guarded.
    // We'll leave the effect but make sure it handles errors gracefully.

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

    // JSON derived values for form submission
    const emailsJson = $derived(JSON.stringify(emails.filter((e) => e.value)));
    const phonesJson = $derived(JSON.stringify(phones.filter((p) => p.value)));
    const addressesJson = $derived(
        JSON.stringify(addresses.filter((a) => a.street || a.city)),
    );
    const relationsJson = $derived(JSON.stringify(relations));
    const tagsJson = $derived(
        JSON.stringify(
            tagsInput
                .split(",")
                .map((t: string) => t.trim())
                .filter(Boolean),
        ),
    );

    // --- Submission Handling ---

    // Superforms Enhance
    // The remote object is spread onto the form.
    // It handles the enhance action internally via the spread attributes/action.

    function getField(name: string) {
        if (!remoteFunction?.fields) return {};
        const parts = name.split(".");
        let current = remoteFunction.fields;
        for (const part of parts) {
            if (!current) return {};
            current = current[part];
        }
        return current || {};
    }

    // Determine name attributes based on mode
    const prefix = $derived(contactId ? "data.contact" : "contact");
</script>

<form
    {...remoteFunction?.preflight?.(schema).enhance(async ({ submit }: any) => {
        console.log("--- ContactForm submission started ---");
        try {
            const result: any = await submit();
            console.log(
                "--- ContactForm submission result ---",
                JSON.stringify(result, null, 2),
            );

            if (result?.success === false || result?.error) {
                // Check specifically for the structured error I added
                const msg =
                    result?.error?.message ||
                    result?.error ||
                    "Oh no! Something went wrong";
                toast.error(msg);
                return;
            }

            toast.success("Successfully Saved!");
            if (onSuccess) onSuccess(result);
            else goto(cancelHref);
        } catch (error: any) {
            console.error("--- ContactForm submission catch ---", error);
            toast.error(error?.message || "Oh no! Something went wrong");
        }
    }) || remoteFunction}
    class="space-y-8"
    method="POST"
>
    <!-- Hidden ID field for updates (Superforms) -->
    {#if contactId}
        <input type="hidden" name="id" value={contactId} />
    {/if}

    <!-- Hidden JSON fields for arrays (Superforms) -->
    <input type="hidden" name="emailsJson" value={emailsJson} />
    <input type="hidden" name="phonesJson" value={phonesJson} />
    <input type="hidden" name="addressesJson" value={addressesJson} />
    <input type="hidden" name="relationsJson" value={relationsJson} />
    <input type="hidden" name="tagsJson" value={tagsJson} />

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
                    {...getField(`${prefix}.displayName`).as("text")}
                    bind:value={contactData.displayName}
                    class="mt-1 block w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 border-gray-300"
                />
            </div>
            <div>
                <label
                    for="givenName"
                    class="block text-sm font-medium text-gray-700"
                    >Given Name</label
                >
                <input
                    {...getField(`${prefix}.givenName`).as("text")}
                    bind:value={contactData.givenName}
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
                    {...getField(`${prefix}.familyName`).as("text")}
                    bind:value={contactData.familyName}
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
                    {...getField(`${prefix}.birthday`).as("date")}
                    bind:value={contactData.birthday}
                    class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
            </div>
        </div>
        <div>
            <label for="notes" class="block text-sm font-medium text-gray-700"
                >Notes</label
            >
            <textarea
                {...getField(`${prefix}.notes`).as("textarea")}
                bind:value={contactData.notes}
                rows="3"
                class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            ></textarea>
        </div>

        <div class="flex items-center gap-2 pt-2">
            <input
                {...getField(`${prefix}.isPublic`).as("checkbox")}
                checked={contactData.isPublic}
                onchange={(e) =>
                    (contactData.isPublic = e.currentTarget.checked)}
                class="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
            />
            <label for="isPublic" class="text-sm font-medium text-gray-700">
                Public Profile (Allow unauthenticated viewing)
            </label>
        </div>

        <div>
            <TagInput
                bind:value={tagsInput}
                placeholder="e.g. Customer, Lead, Priority"
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
                                        `${rel.targetContact?.givenName || ""} ${rel.targetContact?.familyName || ""}`.trim() ||
                                        rel.targetContactId}
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
                                    value={rel.relationType}
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
            loading={(remoteFunction && remoteFunction.pending) || loading}
            loadingLabel="Saving..."
        >
            Save Contact
        </AsyncButton>
    </div>
</form>
