<script lang="ts">
    import {
        Calendar,
        MapPin,
        Users,
        Tag as TagIcon,
        Earth,
        Euro,
        Info,
        Download,
        Pencil,
        Phone,
        Mail,
    } from "@lucide/svelte";

    import Button from "../ui/button/button.svelte";
    import type { Event } from "../../../routes/events/list.remote";

    let {
        event,
        canEdit = false,
        onedit,
    } = $props<{
        event: Event;
        canEdit?: boolean;
        onedit?: () => void;
    }>();

    // Formatting helpers
    function formatDate(dateStr: string | null | undefined) {
        if (!dateStr) return "";
        return new Date(dateStr).toLocaleDateString(undefined, {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
        });
    }

    function formatTime(dateTimeStr: string | null | undefined) {
        if (!dateTimeStr) return "";
        return new Date(dateTimeStr).toLocaleTimeString(undefined, {
            hour: "2-digit",
            minute: "2-digit",
        });
    }

    const startDisplay = $derived(
        event.startDateTime
            ? `${formatDate(event.startDateTime)} at ${formatTime(event.startDateTime)}`
            : formatDate(event.startDate),
    );

    const endDisplay = $derived(
        event.endDateTime
            ? `${formatDate(event.endDateTime)} at ${formatTime(event.endDateTime)}`
            : formatDate(event.endDate),
    );

    const isMultiDay = $derived(
        (event.startDateTime &&
            event.endDateTime &&
            new Date(event.startDateTime).getDate() !==
                new Date(event.endDateTime).getDate()) ||
            (event.startDate &&
                event.endDate &&
                event.startDate !== event.endDate),
    );

    const acceptedCount = $derived(
        Object.values(event.participationStatuses || {}).filter(
            (s) => s === "accepted",
        ).length,
    );

    const occupancyDisplay = $derived(() => {
        let text = `${acceptedCount}`;
        if (event.maxOccupancy) {
            text += ` of ${event.maxOccupancy} maximum`;
        }
        return text;
    });
</script>

<div class="space-y-8">
    <!-- Header with Title and QR -->
    <div class="flex flex-col md:flex-row justify-between items-start gap-6">
        <div class="flex-1">
            <div class="flex items-center gap-3 mb-2 flex-wrap">
                <h1 class="text-3xl font-bold text-gray-900">
                    {event.summary}
                </h1>
                {#if event.isPublic}
                    <span
                        class="px-2 py-0.5 bg-green-100 text-green-800 text-xs font-medium rounded-full flex items-center gap-1"
                    >
                        <Earth size={12} /> Public
                    </span>
                {/if}
                {#if event.status}
                    <span
                        class="px-2 py-0.5 bg-gray-100 text-gray-800 text-xs font-medium rounded-full capitalize"
                    >
                        {event.status}
                    </span>
                {/if}
            </div>
        </div>

        {#if event.qrCodePath}
            <div
                class="bg-white p-2 border rounded-xl shadow-sm flex-shrink-0 flex flex-col items-center"
            >
                <img
                    src={event.qrCodePath}
                    alt="Scan to view event"
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
        <!-- Event Details Column -->
        <div class="space-y-6">
            <section>
                <h3
                    class="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2"
                >
                    <Info size={16} /> Key Details
                </h3>
                <ul class="space-y-3">
                    <li class="flex items-center gap-3 text-gray-700">
                        <Calendar
                            size={18}
                            class="text-blue-500 flex-shrink-0"
                        />
                        <div>
                            <span class="font-medium block">{startDisplay}</span
                            >
                            {#if isMultiDay && endDisplay}
                                <span class="text-sm text-gray-500 block"
                                    >to {endDisplay}</span
                                >
                            {:else if event.endDateTime}
                                <span class="text-sm text-gray-500 block"
                                    >until {formatTime(event.endDateTime)}</span
                                >
                            {/if}
                        </div>
                    </li>
                    {#if event.location}
                        <li class="flex items-center gap-3 text-gray-700">
                            <MapPin
                                size={18}
                                class="text-red-500 flex-shrink-0"
                            />
                            <a
                                href="https://www.google.com/maps/search/?api=1&query={encodeURIComponent(
                                    event.location,
                                )}"
                                target="_blank"
                                rel="noopener noreferrer"
                                class="hover:underline text-blue-600 break-all"
                            >
                                {event.location}
                            </a>
                        </li>
                    {/if}
                    {#if event.categoryBerlinDotDe}
                        <li class="flex items-center gap-3 text-gray-700">
                            <TagIcon
                                size={18}
                                class="text-purple-500 flex-shrink-0"
                            />
                            <span>{event.categoryBerlinDotDe}</span>
                        </li>
                    {/if}
                    {#if event.ticketPrice}
                        <li class="flex items-center gap-3 text-gray-700">
                            <Euro
                                size={18}
                                class="text-green-600 flex-shrink-0"
                            />
                            <span>{event.ticketPrice}</span>
                        </li>
                    {/if}
                    {#if acceptedCount}
                        <li class="flex items-center gap-3 text-gray-700">
                            <Users
                                size={18}
                                class="text-indigo-500 flex-shrink-0"
                            />
                            <span>{occupancyDisplay()}</span>
                        </li>
                    {/if}
                </ul>
            </section>

            {#if event.resolvedContact}
                <section>
                    <h3
                        class="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2"
                    >
                        <Users size={16} /> Contact
                    </h3>
                    <div
                        class="bg-gray-50 p-4 rounded-lg relative border border-gray-100"
                    >
                        <div class="flex gap-4 items-start">
                            {#if event.resolvedContact.qrCodeDataUrl}
                                <div
                                    class="bg-white p-1 rounded border shadow-sm flex-shrink-0"
                                >
                                    <img
                                        src={event.resolvedContact
                                            .qrCodeDataUrl}
                                        alt="Contact QR"
                                        class="w-16 h-16"
                                    />
                                </div>
                            {/if}
                            <div
                                class="flex flex-col gap-1 text-sm min-w-0 flex-1"
                            >
                                <p class="font-bold text-gray-900 truncate">
                                    {event.resolvedContact.name}
                                </p>
                                {#if event.resolvedContact.phone}
                                    <a
                                        href="tel:{event.resolvedContact.phone}"
                                        class="flex items-center gap-2 text-blue-600 hover:underline truncate"
                                    >
                                        <Phone size={14} />
                                        {event.resolvedContact.phone}
                                    </a>
                                {/if}
                                {#if event.resolvedContact.email}
                                    <a
                                        href="mailto:{event.resolvedContact
                                            .email}"
                                        class="flex items-center gap-2 text-blue-600 hover:underline truncate"
                                    >
                                        <Mail size={14} />
                                        {event.resolvedContact.email}
                                    </a>
                                {/if}

                                <a
                                    href={`data:text/vcard;charset=utf-8,${encodeURIComponent(
                                        `BEGIN:VCARD
VERSION:3.0
FN:${event.resolvedContact.name}
EMAIL:${event.resolvedContact.email}
TEL:${event.resolvedContact.phone}
END:VCARD`,
                                    )}`}
                                    download={`${event.resolvedContact.name.replace(/[^a-z0-9]/gi, "_")}.vcf`}
                                    class="inline-flex items-center gap-1 mt-2 text-xs font-medium text-gray-600 hover:text-gray-900 border px-2 py-1 rounded bg-white hover:bg-gray-50 w-max transition-colors"
                                >
                                    <Download size={12} /> Save Contact
                                </a>
                            </div>
                        </div>
                    </div>
                </section>
            {/if}
        </div>

        <!-- Description Column -->
        <div class="space-y-6">
            {#if event.description}
                <section>
                    <h3
                        class="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2"
                    >
                        <Info size={16} /> About this event
                    </h3>
                    <div
                        class="prose max-w-none text-gray-700 whitespace-pre-wrap bg-gray-50 p-4 rounded-lg border border-gray-100"
                    >
                        {event.description}
                    </div>
                </section>
            {/if}
        </div>
    </div>

    <!-- Actions -->
    <div class="flex flex-wrap gap-4 pt-8 border-t">
        {#if event.iCalPath}
            <Button
                href={event.iCalPath}
                download={`${event.summary.replace(/[^a-z0-9]/gi, "_").toLowerCase()}.ics`}
                class="flex items-center gap-2"
                variant="outline"
            >
                <Download size={18} /> Add to Calendar (.ics)
            </Button>
        {/if}

        {#if canEdit}
            <Button
                variant="default"
                class="flex items-center gap-2 bg-blue-600 hover:bg-blue-700"
                onclick={onedit}
            >
                <Pencil size={18} /> Edit Event
            </Button>
        {/if}
    </div>
</div>
