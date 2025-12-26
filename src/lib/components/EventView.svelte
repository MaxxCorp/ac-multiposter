<script lang="ts">
    import {
        Calendar,
        Clock,
        MapPin,
        Download,
        Edit2,
        Globe,
        Tag as TagIcon,
        List,
        Euro,
        Info,
        Users,
    } from "lucide-svelte";
    import Button from "./ui/button/button.svelte";
    import type { Event } from "../../routes/events/list.remote";

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
        let text = `${acceptedCount} yes`;
        if (event.maxOccupancy) {
            text += ` of ${event.maxOccupancy} maximum`;
        }
        return text;
    });
</script>

<div class="space-y-8">
    <!-- Header with Title and QR -->
    <div class="flex flex-col md:flex-row justify-between items-start gap-6">
        <div class="flex-1 space-y-4">
            <div class="flex items-center gap-3 flex-wrap">
                <h1 class="text-3xl font-bold text-gray-900">
                    {event.summary}
                </h1>
                {#if event.isPublic}
                    <span
                        class="px-2 py-0.5 bg-green-100 text-green-800 text-xs font-medium rounded-full flex items-center gap-1"
                    >
                        <Globe size={12} /> Public
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

            <div class="flex flex-col gap-2 text-gray-600">
                <div class="flex items-center gap-2">
                    <Calendar size={18} class="text-blue-500" />
                    <span class="font-medium">{startDisplay}</span>
                    {#if isMultiDay && endDisplay}
                        - <span class="font-medium">{endDisplay}</span>
                    {:else if event.endDateTime}
                        - <span class="font-medium"
                            >{formatTime(event.endDateTime)}</span
                        >
                    {/if}
                </div>
                {#if event.location}
                    <div class="flex items-center gap-2">
                        <MapPin size={18} class="text-red-500" />
                        <span>{event.location}</span>
                    </div>
                {/if}
                {#if event.categoryBerlinDotDe}
                    <div class="flex items-center gap-2">
                        <TagIcon size={18} class="text-purple-500" />
                        <span>{event.categoryBerlinDotDe}</span>
                    </div>
                {/if}
                {#if event.ticketPrice}
                    <div class="flex items-center gap-2">
                        <Euro size={18} class="text-green-600" />
                        <span>{event.ticketPrice}</span>
                    </div>
                {/if}
                <div class="flex items-center gap-2">
                    <Users size={18} class="text-indigo-500" />
                    <span>{occupancyDisplay()}</span>
                </div>
            </div>
        </div>

        {#if event.qrCodePath}
            <div class="bg-white p-2 border rounded-xl shadow-sm flex-shrink-0">
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

    <!-- Description -->
    {#if event.description}
        <div class="prose max-w-none text-gray-700 space-y-2">
            <h3
                class="text-sm font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-2"
            >
                <Info size={16} /> About this event
            </h3>
            <div class="whitespace-pre-wrap">{event.description}</div>
        </div>
    {/if}

    <!-- Resources (only if auth user can see them? Or public? Schema implies public views get stripped of some things usually, but for now we show what we have) -->
    <!-- Ideally we might hide internal resources from public view, but let's assume if it's public, basic info is fine. 
         Actually, the Contact logic stripped relations. Event resources might be internal logic (like "Room 101").
         Let's skip displaying resources in the public view for now to be safe, or just show them if they seem safe.
         Given the user wants a "Public View", usually it's "What, When, Where".
    -->

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
                <Edit2 size={18} /> Edit Event
            </Button>
        {/if}
    </div>
</div>
