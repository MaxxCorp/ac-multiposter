<script lang="ts">
    import { onMount, onDestroy } from "svelte";
    import { fly } from "svelte/transition";
    import { cubicOut } from "svelte/easing";
    import { kioskState } from "$lib/stores/kiosk.svelte";
    import EventView from "$lib/components/events/EventView.svelte";
    import AnnouncementView from "$lib/components/announcements/AnnouncementView.svelte";
    import type { PublicEvent } from "../../../events/list-public.remote";
    import type { Announcement } from "../../../announcements/list.remote";
    import { browser } from "$app/environment";
    // import * as Ably from "ably";
    import { toast } from "svelte-sonner";
    import { invalidate, invalidateAll } from "$app/navigation";

    import { page } from "$app/state";
    import { getKioskForDisplay } from "../read.remote";
    import { listKioskEvents } from "../../../events/list-public.remote";
    import { listKioskAnnouncements } from "../../../announcements/list.remote";

    let kioskId = $derived(page.params.id);
    let kiosk = $state<any>(null);
    let items = $state<(PublicEvent | Announcement)[]>([]);

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
            (kiosk?.loopDuration || 5) * 1000,
        );
    }

    function resetLoop() {
        clearInterval(timer);
        startLoop();
    }

    function nextSlide(auto = false) {
        if (items.length <= 1) return;
        direction = 1;
        currentIndex = (currentIndex + 1) % items.length;
        if (!auto) resetLoop();
    }

    function prevSlide() {
        if (items.length <= 1) return;
        direction = -1;
        currentIndex = (currentIndex - 1 + items.length) % items.length;
        resetLoop();
    }

    async function fetchData() {
        if (!kioskId) return;
        try {
            const [kioskData, eventsData, announcementsData] =
                await Promise.all([
                    getKioskForDisplay(kioskId),
                    listKioskEvents(kioskId),
                    listKioskAnnouncements(),
                ]);

            if (kioskData) {
                kiosk = kioskData;
            }

            const freshItems = [...eventsData, ...announcementsData].sort(
                (a, b) => {
                    return (
                        new Date(a.updatedAt).getTime() -
                        new Date(b.updatedAt).getTime()
                    );
                },
            );

            // Online success: enrich with QR codes for caching and update cache
            const enrichedItems = await Promise.all(
                freshItems.map(async (item) => {
                    let qrData = (item as any).qrCodeDataUrl;

                    // If it's an event and has a path but no dataUrl (or we want to ensure it's loaded), fetch it
                    if ("qrCodePath" in item && item.qrCodePath && !qrData) {
                        try {
                            const res = await fetch(item.qrCodePath);
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
                                item.id,
                                e,
                            );
                        }
                    }
                    return { ...item, qrCodeDataUrl: qrData };
                }),
            );

            items = enrichedItems;

            const storageKey = `kiosk_items_${kioskId}`;
            localStorage.setItem(storageKey, JSON.stringify(enrichedItems));

            // Also cache kiosk details
            localStorage.setItem(
                `kiosk_details_${kioskId}`,
                JSON.stringify(kioskData),
            );

            isOffline = false;
        } catch (e) {
            console.error("Failed to fetch data, attempting offline load", e);
            await initCache();
        }
    }

    $effect(() => {
        if (kioskId) {
            fetchData();
        }
    });

    // --- Offline & Caching Logic ---
    async function initCache() {
        try {
            // 1. Load from storage first if data.items is empty (offline load)
            // 1. Load from storage first if data.items is empty (offline load)
            const storageKey = `kiosk_items_${kioskId}`;
            const stored = localStorage.getItem(storageKey);

            // Also load kiosk details if missing
            if (!kiosk) {
                const storedKiosk = localStorage.getItem(
                    `kiosk_details_${kioskId}`,
                );
                if (storedKiosk) kiosk = JSON.parse(storedKiosk);
            }
            let cachedItems: (PublicEvent | Announcement)[] = stored
                ? JSON.parse(stored)
                : [];

            // Items already loaded via fetchData if online
            // Just need to handle QR code caching if items are present
            if (items.length > 0) {
                const mergedItems = await Promise.all(
                    items.map(async (item) => {
                        // ... existing logic but optimized since we already have items ...
                        // Actually, let's just keep the cache logic simple:
                        // If we fetched fresh items, we might want to ensure QR codes are cached.
                        return item;
                        // For now, assume fetchData handled main loading.
                        // But initCache is called on mount.
                        // If fetchData succeeds, it sets items.
                        // We might want initCache to ONLY handle the offline fallback or QR enrichment.
                    }),
                );
                isOffline = false;
            } else if (cachedItems.length > 0) {
                // Offline fallback
                // Filter out outdated events
                const now = new Date();
                const validItems = cachedItems.filter((item) => {
                    // Check validity for Events
                    if ("startDateTime" in item) {
                        const e = item as PublicEvent;
                        // Simple check: is endDateTime in future?
                        if (e.endDateTime) return new Date(e.endDateTime) > now;
                        if (e.endDate)
                            return new Date(e.endDate + "T23:59:59") > now;
                        return false;
                    }
                    // Announcements always valid
                    return true;
                });

                items = validItems;
                // Update storage to remove old ones
                localStorage.setItem(storageKey, JSON.stringify(validItems));
                isOffline = true;
            }
        } catch (e) {
            console.error("Kiosk offline cache error:", e);
        }
    }

    // --- Gesture Logic ---
    let startX = 0;
    let endX = 0;
    // let announcement = $state<any>((data as any).announcement); // Removed unused legacy state
    let realtime: any | undefined;

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

        // initCache will be called by fetchData on failure, or we can look for basic cache first
        // await initCache();
        // Let's rely on fetchData to drive this.

        if (items.length > 0) {
            startLoop();
        }

        if (browser) {
            // @ts-ignore
            import("ably")
                .then((AblyModule) => {
                    const Ably = AblyModule.default;
                    realtime = new Ably.Realtime(
                        "N_sNCA.u0wYQw:Z-pG0k2QoH0_8L4h2X4Z0k2QoH0_8L4h2X4Z0k2QoH0",
                    );

                    const eventsChannel =
                        realtime.channels.get("event-changes");
                    eventsChannel.subscribe("change", (message: any) => {
                        console.log(
                            "Kiosk Event update received:",
                            message.data,
                        );
                        invalidateAll();
                    });

                    const announcementChannel = realtime.channels.get(
                        "announcement-changes",
                    );
                    announcementChannel.subscribe("change", (message: any) => {
                        console.log(
                            "Kiosk Announcement update received:",
                            message.data,
                        );
                        invalidateAll();
                    });
                })
                .catch((e) => console.error(e));
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
    <title>{kiosk?.name || "Kiosk"}</title>
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
    {#if items.length === 0}
        <div
            class="text-white text-xl opacity-50 flex flex-col items-center gap-4"
        >
            <p>
                {#if isOffline}
                    No cached content available offline.
                {:else}
                    No upcoming content matching this kiosk's settings.
                {/if}
            </p>
            <p class="text-sm">
                Location: {kiosk?.locations && kiosk.locations.length > 0
                    ? kiosk.locations.join(", ")
                    : "All Locations"}
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
                    {#if "startDateTime" in items[currentIndex]}
                        <EventView event={items[currentIndex] as PublicEvent} />
                    {:else}
                        <!-- Wrapper for Announcement to match EventView styling/sizing if needed, or specific component -->
                        <!-- AnnouncementView is usually just the content, we might need a container -->
                        <div
                            class="bg-white p-8 rounded-2xl shadow-2xl w-full max-w-4xl"
                        >
                            <AnnouncementView
                                announcement={items[
                                    currentIndex
                                ] as Announcement}
                            />
                        </div>
                    {/if}

                    <!-- Progress/Status Indicator -->
                    <div class="mt-6 flex gap-2">
                        {#each items as _, i}
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
