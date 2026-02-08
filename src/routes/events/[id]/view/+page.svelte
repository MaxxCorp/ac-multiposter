<script lang="ts">
    import { page } from "$app/state";
    import { readEvent } from "../read.remote";
    import { deleteSeries } from "../delete-series.remote";
    import Breadcrumb from "$lib/components/ui/Breadcrumb.svelte";
    import ErrorSection from "$lib/components/ui/ErrorSection.svelte";
    import LoadingSection from "$lib/components/ui/LoadingSection.svelte";
    import { goto } from "$app/navigation";
    import { onMount } from "svelte";
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
        Share2,
        Trash2,
        RefreshCw,
        ChevronDown,
    } from "@lucide/svelte";
    import Button from "$lib/components/ui/button/button.svelte";
    import { deleteEvents } from "../delete.remote";
    import * as DropdownMenu from "$lib/components/ui/dropdown-menu";

    const eventId = page.params.id || "";
    let dataPromise = $state(readEvent(eventId));

    // Check if the user is authorized to edit
    // Check if the user is authorized to edit
    function checkCanEdit(event: any) {
        const user = page.data.user as any;
        // Allow any authenticated user to edit
        return !!user;
    }

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

    let canShare = $state(false);
    onMount(() => {
        canShare = typeof navigator !== "undefined" && !!navigator.share;
    });

    async function handleShare(event: any) {
        try {
            await navigator.share({
                title: event.summary,
                text: event.description || `Event: ${event.summary}`,
                url: window.location.href,
            });
        } catch (err) {
            if (err instanceof Error && err.name !== "AbortError") {
                console.error("Error sharing:", err);
            }
        }
    }

    // Check if event is part of a series
    function isSeriesEvent(event: any): boolean {
        return !!(
            event.seriesId ||
            event.recurringEventId ||
            (event.recurrence && event.recurrence.length > 0)
        );
    }

    let deletingSeriesId = $state<string | null>(null);

    async function handleDeleteSeries(event: any) {
        const seriesName = event.summary || "this series";
        const confirmed = confirm(
            `Are you sure you want to delete the entire series "${seriesName}"?\n\nThis will delete ALL events in this series. This action cannot be undone.`,
        );

        if (!confirmed) return;

        deletingSeriesId = event.id;
        try {
            await deleteSeries(event.id);
            await goto("/events");
        } catch (err) {
            console.error("Delete series error:", err);
            alert(
                err instanceof Error
                    ? err.message
                    : "An error occurred while deleting the series",
            );
        } finally {
            deletingSeriesId = null;
        }
    }

    async function handleDeleteInstance(event: any) {
        const confirmed = confirm(
            `Are you sure you want to delete this event instance?\n\nOnly this single occurrence will be deleted.`,
        );

        if (!confirmed) return;

        deletingSeriesId = event.id;
        try {
            await deleteEvents([event.id]);
            await goto("/events");
        } catch (err) {
            console.error("Delete instance error:", err);
            alert(
                err instanceof Error
                    ? err.message
                    : "An error occurred while deleting",
            );
        } finally {
            deletingSeriesId = null;
        }
    }
</script>

<div class="container mx-auto px-4 py-8">
    <div class="max-w-4xl mx-auto">
        {#await dataPromise}
            <LoadingSection message="Loading event data..." />
        {:then event}
            {#if event}
                <Breadcrumb feature="events" current={event.summary} />

                <div
                    class="bg-white shadow-xl rounded-2xl p-8 border border-gray-100 space-y-8"
                >
                    <!-- Header with Title and QR -->
                    <div
                        class="flex flex-col md:flex-row justify-between items-start gap-6"
                    >
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
                                {#if event.tags && event.tags.length > 0}
                                    {#each event.tags as tag}
                                        <span
                                            class="px-2 py-0.5 bg-indigo-50 text-indigo-700 text-xs font-medium rounded-full border border-indigo-100 flex items-center gap-1"
                                        >
                                            <TagIcon size={12} />
                                            {tag}
                                        </span>
                                    {/each}
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
                                    <li
                                        class="flex items-center gap-3 text-gray-700"
                                    >
                                        <Calendar
                                            size={18}
                                            class="text-blue-500 flex-shrink-0"
                                        />
                                        <div>
                                            <span class="font-medium block">
                                                {event.startDateTime
                                                    ? `${formatDate(event.startDateTime)} at ${formatTime(event.startDateTime)}`
                                                    : formatDate(
                                                          event.startDate,
                                                      )}
                                            </span>
                                            {#if (event.startDateTime && event.endDateTime && new Date(event.startDateTime).getDate() !== new Date(event.endDateTime).getDate()) || (event.startDate && event.endDate && event.startDate !== event.endDate)}
                                                <span
                                                    class="text-sm text-gray-500 block"
                                                >
                                                    to {event.endDateTime
                                                        ? `${formatDate(event.endDateTime)} at ${formatTime(event.endDateTime)}`
                                                        : formatDate(
                                                              event.endDate,
                                                          )}
                                                </span>
                                            {:else if event.endDateTime}
                                                <span
                                                    class="text-sm text-gray-500 block"
                                                    >until {formatTime(
                                                        event.endDateTime,
                                                    )}</span
                                                >
                                            {/if}
                                        </div>
                                    </li>
                                    {#if event.location}
                                        <li
                                            class="flex items-center gap-3 text-gray-700"
                                        >
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
                                        <li
                                            class="flex items-center gap-3 text-gray-700"
                                        >
                                            <TagIcon
                                                size={18}
                                                class="text-purple-500 flex-shrink-0"
                                            />
                                            <span
                                                >{event.categoryBerlinDotDe}</span
                                            >
                                        </li>
                                    {/if}

                                    {#if event.ticketPrice}
                                        <li
                                            class="flex items-center gap-3 text-gray-700"
                                        >
                                            <Euro
                                                size={18}
                                                class="text-green-600 flex-shrink-0"
                                            />
                                            <span>{event.ticketPrice}</span>
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
                                        <p
                                            class="font-bold text-gray-900 truncate"
                                        >
                                            {event.resolvedContact.name}
                                        </p>
                                        <div class="flex gap-4 items-start">
                                            {#if event.resolvedContact.qrCodeDataUrl}
                                                <div
                                                    class="bg-white p-1 rounded border shadow-sm flex-shrink-0"
                                                >
                                                    <img
                                                        src={event
                                                            .resolvedContact
                                                            .qrCodeDataUrl}
                                                        alt="Contact QR"
                                                        class="w-16 h-16"
                                                    />
                                                </div>
                                            {/if}
                                            <div
                                                class="flex flex-col gap-1 text-sm min-w-0 flex-1"
                                            >
                                                {#if event.resolvedContact.phone}
                                                    <a
                                                        href="tel:{event
                                                            .resolvedContact
                                                            .phone}"
                                                        class="flex items-center gap-2 text-blue-600 hover:underline"
                                                    >
                                                        <Phone size={14} />
                                                        {event.resolvedContact
                                                            .phone}
                                                    </a>
                                                {/if}
                                                {#if event.resolvedContact.email}
                                                    <a
                                                        href="mailto:{event
                                                            .resolvedContact
                                                            .email}"
                                                        class="flex items-center gap-2 text-blue-600 hover:underline"
                                                    >
                                                        <Mail size={14} />
                                                        {event.resolvedContact
                                                            .email}
                                                    </a>
                                                {/if}
                                            </div>
                                        </div>
                                        <a
                                            href={`data:text/vcard;charset=utf-8,${encodeURIComponent(`BEGIN:VCARD\nVERSION:3.0\nFN:${event.resolvedContact.name}\nEMAIL:${event.resolvedContact.email}\nTEL:${event.resolvedContact.phone}\nEND:VCARD`)}`}
                                            download={`${event.resolvedContact.name.replace(/[^a-z0-9]/gi, "_")}.vcf`}
                                            class="inline-flex items-center gap-1 mt-2 text-xs font-medium text-gray-600 hover:text-gray-900 border px-2 py-1 rounded bg-white hover:bg-gray-50 w-max transition-colors"
                                        >
                                            <Download size={12} /> Save Contact
                                        </a>
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
                                        {@html event.description}
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

                        {#if canShare}
                            <Button
                                variant="outline"
                                class="flex items-center gap-2"
                                onclick={() => handleShare(event)}
                            >
                                <Share2 size={18} /> Share
                            </Button>
                        {/if}

                        {#if checkCanEdit(event)}
                            {#if isSeriesEvent(event)}
                                <!-- Edit dropdown for series events -->
                                <DropdownMenu.Root>
                                    <DropdownMenu.Trigger>
                                        <Button
                                            variant="default"
                                            class="flex items-center gap-2 bg-blue-600 hover:bg-blue-700"
                                        >
                                            <Pencil size={18} /> Edit
                                            <ChevronDown size={16} />
                                        </Button>
                                    </DropdownMenu.Trigger>
                                    <DropdownMenu.Content align="end">
                                        <DropdownMenu.Item
                                            onclick={() =>
                                                goto(`/events/${event.id}`)}
                                        >
                                            <Pencil size={16} class="mr-2" /> Edit
                                            Instance
                                        </DropdownMenu.Item>
                                        <DropdownMenu.Item
                                            onclick={() =>
                                                goto(
                                                    `/events/${event.id}?editSeries=true`,
                                                )}
                                        >
                                            <RefreshCw size={16} class="mr-2" />
                                            Edit Series
                                        </DropdownMenu.Item>
                                    </DropdownMenu.Content>
                                </DropdownMenu.Root>

                                <!-- Delete dropdown for series events -->
                                <DropdownMenu.Root>
                                    <DropdownMenu.Trigger>
                                        <Button
                                            variant="outline"
                                            class="flex items-center gap-2 text-red-600 border-red-300 hover:bg-red-50"
                                            disabled={deletingSeriesId ===
                                                event.id}
                                        >
                                            {#if deletingSeriesId === event.id}
                                                <RefreshCw
                                                    size={18}
                                                    class="animate-spin"
                                                /> Deleting...
                                            {:else}
                                                <Trash2 size={18} /> Delete
                                                <ChevronDown size={16} />
                                            {/if}
                                        </Button>
                                    </DropdownMenu.Trigger>
                                    <DropdownMenu.Content align="end">
                                        <DropdownMenu.Item
                                            onclick={() =>
                                                handleDeleteInstance(event)}
                                        >
                                            <Trash2 size={16} class="mr-2" /> Delete
                                            Instance
                                        </DropdownMenu.Item>
                                        <DropdownMenu.Item
                                            class="text-red-600"
                                            onclick={() =>
                                                handleDeleteSeries(event)}
                                        >
                                            <Trash2 size={16} class="mr-2" /> Delete
                                            Series
                                        </DropdownMenu.Item>
                                    </DropdownMenu.Content>
                                </DropdownMenu.Root>
                            {:else}
                                <!-- Simple buttons for non-series events -->
                                <Button
                                    variant="default"
                                    class="flex items-center gap-2 bg-blue-600 hover:bg-blue-700"
                                    onclick={() => goto(`/events/${event.id}`)}
                                >
                                    <Pencil size={18} /> Edit Event
                                </Button>
                            {/if}
                        {/if}
                    </div>
                </div>
            {:else}
                <ErrorSection
                    headline="Event Not Found"
                    message="The event you are looking for does not exist."
                    href="/events"
                    button="Back to Events"
                />
            {/if}
        {:catch error}
            <ErrorSection
                headline="Error"
                message={error instanceof Error
                    ? error.message
                    : "Failed to load event data"}
                href="/events"
                button="Back to Events"
            />
        {/await}
    </div>
</div>
