<script lang="ts">
    import { onMount, onDestroy } from "svelte";
    import { fly } from "svelte/transition";
    import { cubicOut } from "svelte/easing";
    import { kioskState } from "$lib/stores/kiosk.svelte";
    import EventDisplay from "$lib/components/events/EventDisplay.svelte";
    import type { PublicEvent } from "../events/list-public.remote"; // Use the correct public event type

    let { data } = $props();

    let events = $state<PublicEvent[]>([]);

    $effect(() => {
        if (data.events) {
            events = data.events;
        }
    });
    let currentIndex = $state(0);
    let direction = $state(1); // 1 for forward (next), -1 for backward (prev)
    let isOffline = $state(false);

    let timer: ReturnType<typeof setInterval>;
    let inactivityTimer: ReturnType<typeof setTimeout>;

    // Configuration
    const LOOP_INTERVAL = 5000;
    const INACTIVITY_TIMEOUT = 5000;

    // --- Inactivity & Header Logic ---
    function showHeader() {
        console.log("Showing header"); // debug
        kioskState.isHeaderVisible = true;
        clearTimeout(inactivityTimer);
        inactivityTimer = setTimeout(() => {
            console.log("Hiding header due to inactivity"); // debug
            kioskState.isHeaderVisible = false;
        }, INACTIVITY_TIMEOUT);
    }

    function resetInactivity() {
        console.log("Resetting inactivity timer"); // debug
        showHeader();
        // Reset loop timer on interaction to prevent flipping while reading/swiping
        resetLoop();
    }

    // --- Loop Logic ---
    function startLoop() {
        clearInterval(timer);
        timer = setInterval(() => {
            nextSlide(true); // Auto-advance
        }, LOOP_INTERVAL);
    }

    function resetLoop() {
        clearInterval(timer);
        startLoop();
    }

    function nextSlide(auto = false) {
        if (events.length <= 1) return;
        direction = 1;
        currentIndex = (currentIndex + 1) % events.length;
        if (!auto) resetLoop();
    }

    function prevSlide() {
        if (events.length <= 1) return;
        direction = -1;
        currentIndex = (currentIndex - 1 + events.length) % events.length;
        resetLoop();
    }

    // --- Offline & Caching Logic ---
    async function initCache() {
        const STORAGE_KEY = "kiosk_events";
        try {
            // 1. Load from storage first if data.events is empty (offline load)
            const stored = localStorage.getItem(STORAGE_KEY);
            let cachedEvents: PublicEvent[] = stored ? JSON.parse(stored) : [];

            // Identify if we are strictly offline (server load failed/empty)
            // Note: remote function might return empty array if really no events, but here we assume network failure usually throws or returns null if not handled.
            // Our load function returns { events: [] } on success.
            // If data.events is populated, we trust it broadly.

            if (data.events && data.events.length > 0) {
                // Online or cached by ServiceWorker/SSR. Merge/Update storage.
                // We want to preserve qrCodeDataUrl from cache if the server didn't send it (server sends path).

                const mergedEvents = await Promise.all(
                    data.events.map(async (srvEvent) => {
                        const cached = cachedEvents.find(
                            (c) => c.id === srvEvent.id,
                        );
                        let qrData = cached?.qrCodeDataUrl;

                        // If we have a path but no dataUrl, fetch it
                        if (srvEvent.qrCodePath && !qrData) {
                            try {
                                const res = await fetch(srvEvent.qrCodePath);
                                if (res.ok) {
                                    const blob = await res.blob();
                                    qrData = await new Promise((resolve) => {
                                        const reader = new FileReader();
                                        reader.onloadend = () =>
                                            resolve(reader.result as string);
                                        reader.readAsDataURL(blob);
                                    });
                                }
                            } catch (e) {
                                console.error(
                                    "Failed to cache QR code for event",
                                    srvEvent.id,
                                    e,
                                );
                            }
                        } else if (!srvEvent.qrCodePath) {
                            qrData = undefined;
                        }

                        return { ...srvEvent, qrCodeDataUrl: qrData };
                    }),
                );

                events = mergedEvents;
                localStorage.setItem(STORAGE_KEY, JSON.stringify(mergedEvents));
                isOffline = false;
            } else if (cachedEvents.length > 0) {
                // Offline fallback
                // Filter out outdated events
                const now = new Date();
                const validEvents = cachedEvents.filter((e) => {
                    // Simple check: is endDateTime in future?
                    if (e.endDateTime) return new Date(e.endDateTime) > now;
                    if (e.endDate)
                        return new Date(e.endDate + "T23:59:59") > now;
                    return false;
                });

                events = validEvents;
                // Update storage to remove old ones
                localStorage.setItem(STORAGE_KEY, JSON.stringify(validEvents));
                isOffline = true;
            }
        } catch (e) {
            console.error("Kiosk offline cache error:", e);
        }
    }

    // --- Gesture Logic ---
    let startX = 0;
    let endX = 0;

    function handlePointerDown(e: PointerEvent) {
        startX = e.screenX;
        resetInactivity();
    }

    function handlePointerUp(e: PointerEvent) {
        endX = e.screenX;
        handleSwipe();
        resetInactivity();
    }

    function handleSwipe() {
        const threshold = 50;
        if (endX < startX - threshold) {
            // Swiped Left -> User Requirement: "swiping left (back)"
            prevSlide();
        } else if (endX > startX + threshold) {
            // Swiped Right -> User Requirement: "swiping right (forward)"
            nextSlide();
        }
    }

    onMount(async () => {
        kioskState.isKiosk = true;
        // Start header as visible, then hide
        showHeader();

        await initCache();

        if (events.length > 0) {
            startLoop();
        }
    });

    onDestroy(() => {
        kioskState.isKiosk = false;
        kioskState.isHeaderVisible = true; // Restore for other pages
        clearInterval(timer);
        clearTimeout(inactivityTimer);
    });
</script>

<svelte:head>
    <title>Kiosk Mode</title>
</svelte:head>

<svelte:window
    onmousemove={resetInactivity}
    onmousedown={resetInactivity}
    onkeydown={resetInactivity}
/>

<div
    class="fixed inset-0 bg-gray-900 overflow-hidden flex items-center justify-center"
    onpointerdown={handlePointerDown}
    onpointerup={handlePointerUp}
    role="region"
    aria-label="Event Kiosk"
>
    {#if events.length === 0}
        <div class="text-white text-xl opacity-50">
            {#if isOffline}
                No cached events available offline.
            {:else}
                No upcoming public events.
            {/if}
        </div>
    {:else}
        {#key currentIndex}
            <div
                class="absolute inset-0 w-full h-full flex items-center justify-center p-4 sm:p-8 md:p-12"
                in:fly={{
                    x: direction * 500,
                    duration: 600,
                    opacity: 0,
                    easing: cubicOut,
                }}
                out:fly={{
                    x: direction * -500,
                    duration: 600,
                    opacity: 0,
                    easing: cubicOut,
                }}
            >
                <div class="w-full h-full max-w-7xl relative">
                    <EventDisplay event={events[currentIndex]} />

                    <!-- Progress/Status Indicator -->
                    <div
                        class="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2"
                    >
                        {#each events as _, i}
                            <div
                                class="w-2 h-2 rounded-full transition-colors duration-300 {i ===
                                currentIndex
                                    ? 'bg-white'
                                    : 'bg-white/30'}"
                            ></div>
                        {/each}
                    </div>

                    {#if isOffline}
                        <div
                            class="absolute top-4 right-4 text-white/50 text-xs bg-black/30 px-2 py-1 rounded"
                        >
                            Offline Mode
                        </div>
                    {/if}
                </div>
            </div>
        {/key}
    {/if}
</div>
