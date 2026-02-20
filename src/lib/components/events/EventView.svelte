<script lang="ts">
    import type { PublicEvent } from "../../../routes/events/list-public.remote";
    import {
        Calendar,
        Clock,
        MapPin,
        Users,
        Globe,
        QrCode,
        Accessibility,
        Tag,
        Euro,
    } from "@lucide/svelte";

    let { event }: { event: PublicEvent } = $props();

    function formatDateTime(dateStr: string | null) {
        if (!dateStr) return "";
        return new Date(dateStr).toLocaleString("en-US", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
            hour: "numeric",
            minute: "2-digit",
        });
    }

    function formatDate(dateStr: string | null) {
        if (!dateStr) return "";
        return new Date(dateStr).toLocaleDateString("en-US", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
            hour: "numeric",
        });
    }

    const displayDate = $derived(
        event.isAllDay && event.startDateTime
            ? formatDate(event.startDateTime)
            : event.startDateTime
              ? formatDateTime(event.startDateTime)
              : "",
    );

    let imageLoadError = $state(false);
</script>

<div
    class="max-w-4xl mx-auto bg-white shadow-xl rounded-2xl overflow-hidden border border-gray-100"
>
    <!-- Header / Banner -->
    <div class="bg-gradient-to-r from-blue-600 to-indigo-700 p-8 text-white">
        <h1 class="text-4xl font-extrabold tracking-tight mb-2">
            {event.summary}
        </h1>
        <div class="flex items-center gap-2 text-blue-100 text-lg">
            <Calendar class="w-5 h-5" />
            <span>{displayDate}</span>
        </div>
    </div>

    <div class="p-8 grid grid-cols-1 md:grid-cols-3 gap-8">
        <!-- Main Content -->
        <div class="md:col-span-2 space-y-8">
            <!-- Description -->
            <div class="prose prose-lg text-gray-600 max-w-none">
                <div class="whitespace-pre-wrap">
                    {@html event.description || "No description provided."}
                </div>
            </div>

            <!-- Meta Data Grid -->
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {#if event.location}
                    <div
                        class="flex items-start gap-3 p-4 bg-gray-50 rounded-xl"
                    >
                        <MapPin class="w-7 h-7 text-blue-600 mt-0.5" />
                        <div>
                            <h3 class="font-semibold text-gray-900">
                                Location
                            </h3>
                            <p class="text-gray-600">{event.location}</p>
                        </div>
                    </div>
                {/if}

                {#if event.resolvedContact}
                    <div
                        class="flex items-start gap-3 p-4 bg-gray-50 rounded-xl"
                    >
                        <Users class="w-6 h-6 text-blue-600 mt-1" />
                        <div>
                            <h3 class="font-semibold text-gray-900">Contact</h3>
                            <p class="text-gray-900 font-medium text-sm">
                                {event.resolvedContact.name}
                            </p>

                            {#if event.resolvedContact.address}
                                <p class="text-sm text-gray-600 mt-1">
                                    {event.resolvedContact.address.street}
                                    {event.resolvedContact.address
                                        .houseNumber}<br />
                                    {event.resolvedContact.address.zip}
                                    {event.resolvedContact.address.city}<br />
                                    {event.resolvedContact.address.country}
                                </p>
                            {/if}

                            <div class="mt-2 space-y-1">
                                {#each event.resolvedContact.emails as email}
                                    <p class="text-sm text-gray-600">
                                        <a
                                            href="mailto:{email.value}"
                                            class="hover:text-blue-600"
                                            >{email.value}</a
                                        >
                                        {#if email.type}<span
                                                class="text-xs text-gray-400 ml-1"
                                                >({email.type})</span
                                            >{/if}
                                    </p>
                                {/each}
                                {#each event.resolvedContact.phones as phone}
                                    <p class="text-sm text-gray-600">
                                        <a
                                            href="tel:{phone.value}"
                                            class="hover:text-blue-600"
                                            >{phone.value}</a
                                        >
                                        {#if phone.type}<span
                                                class="text-xs text-gray-400 ml-1"
                                                >({phone.type})</span
                                            >{/if}
                                    </p>
                                {/each}
                            </div>

                            <!-- Contact QR Code -->
                            {#if event.resolvedContact.qrCodeDataUrl}
                                <div class="mt-4">
                                    <img
                                        src={event.resolvedContact
                                            .qrCodeDataUrl}
                                        alt="Contact QR"
                                        class="w-24 h-24 object-contain border rounded-lg bg-white p-1"
                                    />
                                    <p class="text-xs text-gray-500 mt-1">
                                        Scan Contact Info
                                    </p>
                                </div>
                            {/if}
                        </div>
                    </div>
                {/if}
            </div>
        </div>

        <!-- Sidebar / Visuals -->
        <div class="space-y-6">
            <!-- QR Code Card -->
            {#if event.qrCodeDataUrl || event.qrCodePath}
                <div
                    class="bg-white border border-gray-200 rounded-xl p-6 shadow-sm flex flex-col items-center text-center"
                >
                    <div class="bg-gray-100 p-4 rounded-lg mb-4">
                        {#if event.qrCodeDataUrl}
                            <img
                                src={event.qrCodeDataUrl}
                                alt="QR Code"
                                class="w-32 h-32 object-contain"
                            />
                        {:else if event.qrCodePath}
                            <!-- Fallback to server path if offline cache (dataUrl) is missing/failed -->
                            {#if !imageLoadError}
                                <img
                                    src={event.qrCodePath}
                                    alt="QR Code"
                                    class="w-32 h-32 object-contain"
                                    onerror={() => (imageLoadError = true)}
                                />
                            {:else}
                                <QrCode class="w-32 h-32 text-gray-800" />
                            {/if}
                        {/if}
                    </div>
                    <p class="text-sm text-gray-500 font-medium">
                        Scan for details
                    </p>
                </div>
            {/if}

            <!-- Event Details Sidebar -->
            {#if event.ticketPrice || event.categoryBerlinDotDe || (event.confirmedParticipants !== undefined && event.confirmedParticipants > 0) || (event.inclusivityInformation && event.inclusivityInformation.length > 0)}
                <div
                    class="bg-indigo-50 rounded-xl p-6 border border-indigo-100"
                >
                    <h3
                        class="font-semibold text-indigo-900 mb-4 flex items-center gap-2"
                    >
                        <Tag class="w-5 h-5 text-indigo-700" />
                        Event Details
                    </h3>

                    <div class="space-y-4">
                        {#if event.ticketPrice}
                            <div
                                class="flex items-center gap-3 text-indigo-800"
                            >
                                <Euro class="w-5 h-5 opacity-75" />
                                <span class="text-sm font-medium"
                                    >{event.ticketPrice}</span
                                >
                            </div>
                        {/if}

                        {#if event.categoryBerlinDotDe}
                            <div class="flex items-start gap-3 text-indigo-800">
                                <div class="mt-1">
                                    <Tag class="w-5 h-5 opacity-75" />
                                </div>
                                <span
                                    class="bg-white/50 px-2 py-1 rounded text-sm font-medium"
                                >
                                    {event.categoryBerlinDotDe}
                                </span>
                            </div>
                        {/if}

                        {#if event.confirmedParticipants !== undefined && event.confirmedParticipants > 0}
                            <div class="flex items-start gap-3 text-indigo-800">
                                <div class="mt-1">
                                    <Users class="w-5 h-5 opacity-75" />
                                </div>
                                <span class="text-sm">
                                    <strong
                                        >{event.confirmedParticipants}</strong
                                    >
                                    confirmed participants
                                    {#if event.maxOccupancy}
                                        <span class="opacity-75 block text-xs"
                                            >Capacity: {event.maxOccupancy}</span
                                        >
                                    {/if}
                                </span>
                            </div>
                        {/if}

                        {#if event.inclusivityInformation && event.inclusivityInformation.length > 0}
                            <div class="flex items-start gap-3 text-indigo-800">
                                <div class="mt-1">
                                    <Accessibility class="w-5 h-5 opacity-75" />
                                </div>
                                <div class="flex flex-wrap gap-1.5">
                                    {#each event.inclusivityInformation as info}
                                        <span
                                            class="bg-white/50 text-indigo-900 px-2 py-0.5 rounded text-sm border border-indigo-100/50"
                                        >
                                            {info}
                                        </span>
                                    {/each}
                                </div>
                            </div>
                        {/if}
                    </div>
                </div>
            {/if}
        </div>
    </div>
</div>
