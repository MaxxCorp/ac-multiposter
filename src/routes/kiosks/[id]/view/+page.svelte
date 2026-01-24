<script lang="ts">
    import { onMount, onDestroy } from "svelte";
    import { fly } from "svelte/transition";
    import { cubicOut } from "svelte/easing";
    import { kioskState } from "$lib/stores/kiosk.svelte";
    import EventView from "$lib/components/events/EventView.svelte";
    import type { PublicEvent } from "../../../events/list-public.remote";
    import { browser } from "$app/environment";
    import * as Ably from "ably";
    import { toast } from "svelte-sonner";
    import { invalidate } from "$app/navigation";

    let { data } = $props();

    let events = $state<PublicEvent[]>([]);

    // Derived from Kiosk Data - Accessed directly in functions to ensure reactivity

    $effect(() => {
        if (data.events) {
            events = data.events;
            // Ensure offline cache is updated when new data comes in
            const storageKey = `kiosk_events_${data.kiosk.id}`;
            localStorage.setItem(storageKey, JSON.stringify(data.events));
        }
    });
    let currentIndex = $state(0);
    let direction = $state(1); // 1 for forward (next), -1 for backward (prev)
    let isOffline = $state(false);

    let timer: ReturnType<typeof setInterval>;
    let inactivityTimer: ReturnType<typeof setTimeout>;

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
        timer = setInterval(
            () => {
                nextSlide(true); // Auto-advance
            },
            (data.kiosk.loopDuration || 5) * 1000,
        );
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
        try {
            // 1. Load from storage first if data.events is empty (offline load)
            const storageKey = `kiosk_events_${data.kiosk.id}`;
            const stored = localStorage.getItem(storageKey);
            let cachedEvents: PublicEvent[] = stored ? JSON.parse(stored) : [];

            if (data.events && data.events.length > 0) {
                // Online or cached by ServiceWorker/SSR. Merge/Update storage.
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
                const storageKey = `kiosk_events_${data.kiosk.id}`;
                localStorage.setItem(storageKey, JSON.stringify(mergedEvents));
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
                const storageKey = `kiosk_events_${data.kiosk.id}`;
                localStorage.setItem(storageKey, JSON.stringify(validEvents));
                isOffline = true;
            }
        } catch (e) {
            console.error("Kiosk offline cache error:", e);
        }
    }

    // --- Gesture Logic ---
    let startX = 0;
    let endX = 0;
    let realtime: Ably.Realtime | undefined;

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

        if (browser) {
            try {
                realtime = new Ably.Realtime({ authUrl: "/api/ably/auth" });
                const eventsChannel = realtime.channels.get("event-changes");
                eventsChannel.subscribe("change", (message) => {
                    console.log("Kiosk Event update received:", message.data);
                    invalidate("app:events");
                    toast.info("Events updated", {
                        description: "Refreshing kiosk...",
                    });
                });
            } catch (e) {
                console.error("Failed to connect to Ably:", e);
            }
        }
    });

    onDestroy(() => {
        if (realtime) {
            realtime.close();
        }
        kioskState.isKiosk = false;
        kioskState.isHeaderVisible = true; // Restore for other pages
        clearInterval(timer);
        clearTimeout(inactivityTimer);
    });
</script>

<svelte:head>
    <title>{data.kiosk.name}</title>
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
        <div
            class="text-white text-xl opacity-50 flex flex-col items-center gap-4"
        >
            <p>
                {#if isOffline}
                    No cached events available offline.
                {:else}
                    No upcoming events matching this kiosk's settings.
                {/if}
            </p>
            <p class="text-sm">
                Location: {data.kiosk.location?.name || "Unknown"}
            </p>
        </div>
    {:else}
        {#key currentIndex}
            <div
                class="absolute inset-0 w-full h-full flex flex-col items-center justify-center p-4 sm:p-8 md:p-12 overflow-y-auto"
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
                <div
                    class="w-full max-w-7xl relative flex flex-col items-center"
                >
                    <EventView event={events[currentIndex]} />

                    <!-- Progress/Status Indicator -->
                    <div class="mt-6 flex gap-2">
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
