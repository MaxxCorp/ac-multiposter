<script lang="ts">
    import {
        Mail,
        Phone,
        MapPin,
        Tag as TagIcon,
        Download,
        Pencil,
        Earth,
    } from "@lucide/svelte";
    import Button from "../ui/button/button.svelte";

    let { contact, canEdit = false, onedit } = $props();

    const fullName = $derived(
        contact.displayName ||
            `${contact.givenName || ""} ${contact.familyName || ""}`.trim() ||
            "Unnamed Contact",
    );
</script>

<div class="space-y-8">
    <!-- Header with Name and QR -->
    <div class="flex flex-col md:flex-row justify-between items-start gap-6">
        <div class="flex-1">
            <div class="flex items-center gap-3 mb-2 flex-wrap">
                <h1 class="text-3xl font-bold text-gray-900">{fullName}</h1>
                {#if contact.isPublic}
                    <span
                        class="px-2 py-0.5 bg-green-100 text-green-800 text-xs font-medium rounded-full flex items-center gap-1"
                    >
                        <Earth size={12} /> Public
                    </span>
                {/if}
                {#if contact.tags && contact.tags.length > 0}
                    {#each contact.tags as t}
                        <span
                            class="px-2 py-0.5 bg-indigo-100 text-indigo-800 text-xs font-medium rounded-full flex items-center gap-1"
                        >
                            <TagIcon size={12} />
                            {t.name}
                        </span>
                    {/each}
                {/if}
            </div>
            {#if contact.honorificPrefix || contact.honorificSuffix}
                <p class="text-gray-500 text-lg">
                    {contact.honorificPrefix || ""}
                    {contact.honorificSuffix || ""}
                </p>
            {/if}
            {#if contact.notes}
                <p class="mt-4 text-gray-600 italic">"{contact.notes}"</p>
            {/if}
        </div>

        {#if contact.qrCodePath}
            <div class="bg-white p-2 border rounded-xl shadow-sm">
                <img
                    src={contact.qrCodePath}
                    alt="Scan to view contact"
                    class="w-32 h-32"
                />
                <p
                    class="text-[10px] text-center text-gray-400 mt-1 uppercase tracking-wider font-bold"
                >
                    Scan to share
                </p>
            </div>
        {/if}
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
        <!-- Emails & Phones -->
        <div class="space-y-6">
            {#if contact.emails && contact.emails.length > 0}
                <section>
                    <h3
                        class="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2"
                    >
                        <Mail size={16} /> Emails
                    </h3>
                    <ul class="space-y-3">
                        {#each contact.emails as email}
                            <li
                                class="flex items-center justify-between group flex-wrap"
                            >
                                <span class="text-gray-700"
                                    ><a
                                        href="mailto:{email.value}"
                                        class="flex items-center gap-2 text-blue-600 hover:underline break-all text-pretty"
                                    >
                                        {email.value}
                                    </a></span
                                >
                                <span
                                    class="text-xs text-gray-400 bg-gray-50 px-2 py-1 rounded capitalize"
                                    >{email.type}</span
                                >
                            </li>
                        {/each}
                    </ul>
                </section>
            {/if}

            {#if contact.phones && contact.phones.length > 0}
                <section>
                    <h3
                        class="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2"
                    >
                        <Phone size={16} /> Phone Numbers
                    </h3>
                    <ul class="space-y-3">
                        {#each contact.phones as phone}
                            <li
                                class="flex items-center justify-between group flex-wrap"
                            >
                                <span class="text-gray-700"
                                    ><a
                                        href="tel:{phone.value}"
                                        class="flex items-center gap-2 text-blue-600 hover:underline break-all text-pretty"
                                    >
                                        {phone.value}
                                    </a></span
                                >
                                <span
                                    class="text-xs text-gray-400 bg-gray-50 px-2 py-1 rounded capitalize"
                                    >{phone.type}</span
                                >
                            </li>
                        {/each}
                    </ul>
                </section>
            {/if}
        </div>

        <!-- Addresses -->
        <div class="space-y-6">
            {#if contact.addresses && contact.addresses.length > 0}
                <section>
                    <h3
                        class="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2"
                    >
                        <MapPin size={16} /> Addresses
                    </h3>
                    <div class="space-y-4">
                        {#each contact.addresses as addr}
                            <div class="bg-gray-50 p-4 rounded-lg relative">
                                <span
                                    class="absolute top-2 right-2 text-[10px] font-bold text-gray-300 uppercase"
                                    >{addr.type}</span
                                >
                                <p class="text-gray-800">
                                    {addr.street || ""}
                                    {addr.houseNumber || ""}
                                </p>
                                <p class="text-gray-600">
                                    {addr.zip || ""}
                                    {addr.city || ""}
                                </p>
                                {#if addr.state || addr.country}
                                    <p class="text-gray-500 text-sm">
                                        {addr.state || ""}
                                        {addr.country || ""}
                                    </p>
                                {/if}
                            </div>
                        {/each}
                    </div>
                </section>
            {/if}
        </div>
    </div>

    <!-- Actions -->
    <div class="flex flex-wrap gap-4 pt-8 border-t">
        {#if contact.vCardPath}
            <Button
                href={contact.vCardPath}
                download={`${fullName.replace(/\s+/g, "_")}.vcf`}
                class="flex items-center gap-2"
                variant="outline"
            >
                <Download size={18} /> Download vCard
            </Button>
        {/if}

        {#if canEdit}
            <Button
                variant="default"
                class="flex items-center gap-2 bg-blue-600 hover:bg-blue-700"
                onclick={onedit}
            >
                <Pencil size={18} /> Edit Contact
            </Button>
        {/if}
    </div>
</div>
