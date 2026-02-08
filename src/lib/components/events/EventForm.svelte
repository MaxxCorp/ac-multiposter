<script lang="ts">
    import { goto } from "$app/navigation";
    import type { Event } from "../../../routes/events/list.remote";
    import { deleteEvents as deleteEventAction } from "../../../routes/events/[id]/delete.remote";
    import Breadcrumb from "$lib/components/ui/Breadcrumb.svelte";
    import AsyncButton from "$lib/components/ui/AsyncButton.svelte";
    import { toast } from "svelte-sonner";
    import { Button } from "$lib/components/ui/button";
    import { handleDelete } from "$lib/hooks/handleDelete.svelte";
    import type { updateExistingEvent } from "../../../routes/events/[id]/update.remote";
    import type { createNewEvent } from "../../../routes/events/new/create.remote";
    import {
        listResourcesWithHierarchy,
        type ResourceWithHierarchy,
    } from "../../../routes/resources/list-with-hierarchy.remote";
    import {
        listLocations,
        type Location,
    } from "../../../routes/locations/list.remote";
    import ContactManager from "$lib/components/contacts/ContactManager.svelte";
    import LocationSelector from "$lib/components/locations/LocationSelector.svelte";
    import RichTextEditor from "$lib/components/cms/RichTextEditor.svelte";
    import RecurrenceDialog from "$lib/components/events/RecurrenceDialog.svelte";
    import TagInput from "$lib/components/ui/TagInput.svelte";
    import { RRule } from "$lib/utils/rrule-compat";
    import { CalendarClock } from "@lucide/svelte";

    let {
        remoteFunction,
        validationSchema,
        isUpdating = false,
        initialData = null,
    }: {
        remoteFunction: typeof updateExistingEvent | typeof createNewEvent;
        validationSchema: any;
        isUpdating?: boolean;
        initialData?: Event | null;
    } = $props();

    // State derived from initialData
    let isAllDay = $state(
        initialData?.startDateTime || initialData?.startDate
            ? !initialData.startDateTime && !!initialData.startDate
            : false,
    );

    let hasEndTime = $state(
        initialData?.endDateTime || initialData?.endDate
            ? !!(initialData.endDateTime || initialData.endDate)
            : true,
    );
    let useDefaultReminders = $state(
        initialData?.reminders?.useDefault ?? true,
    );
    let reminders = $state(
        initialData?.reminders?.overrides ?? [{ method: "popup", minutes: 10 }],
    );

    let guestsCanInviteOthers = $state(
        initialData?.guestsCanInviteOthers ?? true,
    );
    let guestsCanModify = $state(initialData?.guestsCanModify ?? false);
    let guestsCanSeeOtherGuests = $state(
        initialData?.guestsCanSeeOtherGuests ?? false,
    );
    let isPublic = $state(initialData?.isPublic ?? false);

    // Recurrence State
    let recurrence = $state<string[]>(initialData?.recurrence || []);
    // We only support creating single rule recurrences in UI for now
    let recurrenceRule = $state<string | null>(recurrence[0] || null);
    let showRecurrenceDialog = $state(false);

    // Tags State
    // Initial tags are string[] from read.remote.ts
    let tags = $state<string[]>(initialData?.tags || []);
    let tagsString = $state(tags.join(", "));

    // Helper to format RRule text
    let recurrenceText = $derived(
        recurrenceRule
            ? (() => {
                  try {
                      return RRule.fromString(recurrenceRule).toText();
                  } catch {
                      return "Custom Recurrence";
                  }
              })()
            : "Does not repeat",
    );

    const hiddenRecurrenceRule = $derived(recurrenceRule ?? "");
    const hiddenTagsString = $derived(tagsString ?? "");

    // Resource and location state
    let resourcesPromise = listResourcesWithHierarchy();
    let locationsPromise = listLocations();
    let selectedResourceIds = $state<string[]>(initialData?.resourceIds || []);
    let selectedContactIds = $state<string[]>(initialData?.contactIds || []);
    let freeTextLocation = $state(initialData?.location || "");

    // Helper to find location ID from text (for initial matching)
    async function findInitialLocationId() {
        if (!initialData?.location) return "";
        const locations = await locationsPromise;
        const match = locations.find((l: Location) => {
            const parts = [l.name];
            if (l.roomId) parts.push(l.roomId);
            // Simple check for start of string or full match
            const fullStr = parts.join(", ");
            return initialData.location?.startsWith(fullStr);
        });
        return match ? match.id : "";
    }

    let selectedLocationIds = $state<string[]>(initialData?.locationIds || []);
    $effect(() => {
        if (initialData?.locationIds && initialData.locationIds.length > 0) {
            selectedLocationIds = initialData.locationIds;
            useFreeTextLocation = false;
        } else if (initialData?.location) {
            // Fallback logic for legacy single-string location finding if needed
            findInitialLocationId().then((id) => {
                if (id) {
                    selectedLocationIds = [id];
                    useFreeTextLocation = false;
                }
            });
        }
    });

    const BERLIN_DE_CATEGORIES = [
        "Ausstellungen",
        "Bälle & Galas",
        "Bildung & Vorträge",
        "Festivals",
        "Jazz & Blues",
        "Kabarett & Comedy",
        "Kinderveranstaltungen",
        "Klassische Konzerte",
        "Literatur",
        "Musical",
        "Oper & Tanz",
        "Pop, Rock & HipHop",
        "Schlager & Volksmusik",
        "Show",
        "Sport",
        "Theater",
        "Vermischtes",
    ];

    let useFreeTextLocation = $state(
        !!initialData?.location &&
            (!initialData?.locationIds || initialData.locationIds.length === 0),
    );

    let descriptionValue = $state(
        getField("description").value() ?? initialData?.description ?? "",
    );
    const hiddenDescription = $derived(descriptionValue ?? "");

    // Date/Time handling
    const browserTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

    const remindersJson = $derived(
        JSON.stringify({
            useDefault: useDefaultReminders,
            overrides: reminders,
        }),
    );

    function parseDateTime(dt: string | null | undefined) {
        if (!dt) return { date: "", time: "" };
        try {
            const d = new Date(dt);
            if (isNaN(d.getTime())) return { date: "", time: "" };
            const year = d.getFullYear();
            const month = String(d.getMonth() + 1).padStart(2, "0");
            const day = String(d.getDate()).padStart(2, "0");
            const hours = String(d.getHours()).padStart(2, "0");
            const minutes = String(d.getMinutes()).padStart(2, "0");
            return {
                date: `${year}-${month}-${day}`,
                time: `${hours}:${minutes}`,
            };
        } catch {
            return { date: "", time: "" };
        }
    }

    const startParsed = parseDateTime(
        initialData?.startDateTime || initialData?.startDate,
    );
    const endParsed = parseDateTime(
        initialData?.endDateTime || initialData?.endDate,
    );

    let startDateInput = $state(
        startParsed.date || new Date().toISOString().split("T")[0],
    );
    let startTimeInput = $state(
        startParsed.time || new Date().toTimeString().slice(0, 5),
    );

    // Initialize end date/time: if no initial data, set to 1 hour after start
    function getInitialEndDateTime() {
        // If we have initial end data, use it
        if (endParsed.date)
            return { date: endParsed.date, time: endParsed.time || "" };

        // Otherwise, calculate 1 hour after start
        const startDate =
            startParsed.date || new Date().toISOString().split("T")[0];
        const startTime =
            startParsed.time || new Date().toTimeString().slice(0, 5);
        const start = new Date(`${startDate}T${startTime}:00`);
        if (isNaN(start.getTime())) return { date: "", time: "" };

        const end = new Date(start.getTime() + 60 * 60000);
        const year = end.getFullYear();
        const month = String(end.getMonth() + 1).padStart(2, "0");
        const day = String(end.getDate()).padStart(2, "0");
        const hours = String(end.getHours()).padStart(2, "0");
        const minutes = String(end.getMinutes()).padStart(2, "0");

        return { date: `${year}-${month}-${day}`, time: `${hours}:${minutes}` };
    }

    const initialEnd = getInitialEndDateTime();
    let endDateInput = $state(initialEnd.date);
    let endTimeInput = $state(initialEnd.time);

    // Sync default end time when start time changes if end time is empty
    function updateEndDateTime() {
        if (!startDateInput || !startTimeInput) return;

        const start = new Date(`${startDateInput}T${startTimeInput}:00`);
        if (isNaN(start.getTime())) return;

        const end = new Date(start.getTime() + 60 * 60000);
        const year = end.getFullYear();
        const month = String(end.getMonth() + 1).padStart(2, "0");
        const day = String(end.getDate()).padStart(2, "0");
        const hours = String(end.getHours()).padStart(2, "0");
        const minutes = String(end.getMinutes()).padStart(2, "0");

        endDateInput = `${year}-${month}-${day}`;
        endTimeInput = `${hours}:${minutes}`;
    }

    // Auto-set end time logic
    function getDefaultEndTime() {
        if (!startDateInput || !startTimeInput) return "";
        const start = new Date(`${startDateInput}T${startTimeInput}:00`);
        const end = new Date(start.getTime() + 60 * 60000);
        return end.toTimeString().slice(0, 5);
    }

    // Derived values for the hidden fields
    const computedStart = $derived(
        isAllDay
            ? startDateInput
            : startDateInput && startTimeInput
              ? new Date(`${startDateInput}T${startTimeInput}:00`).toISOString()
              : "",
    );
    const computedEnd = $derived(
        hasEndTime
            ? isAllDay
                ? endDateInput || startDateInput
                : endDateInput && endTimeInput
                  ? new Date(`${endDateInput}T${endTimeInput}:00`).toISOString()
                  : startDateInput && endTimeInput
                    ? new Date(
                          `${startDateInput}T${endTimeInput}:00`,
                      ).toISOString()
                    : ""
            : "",
    );

    function getField(name: string) {
        if (!(remoteFunction as any).fields) return {};
        const parts = name.split(".");
        let current = (remoteFunction as any).fields;
        for (const part of parts) {
            if (!current) return {};
            current = current[part];
        }
        return current || {};
    }

    async function toggleResource(resourceId: string) {
        if (selectedResourceIds.includes(resourceId)) {
            selectedResourceIds = selectedResourceIds.filter(
                (id) => id !== resourceId,
            );
        } else {
            selectedResourceIds = [...selectedResourceIds, resourceId];
            // Prefill location if empty
            if (selectedLocationIds.length === 0 && !useFreeTextLocation) {
                const resources = await resourcesPromise;
                const res = resources.find(
                    (r: ResourceWithHierarchy) => r.id === resourceId,
                );
                if (
                    res?.locationId &&
                    !selectedLocationIds.includes(res.locationId)
                ) {
                    selectedLocationIds = [
                        ...selectedLocationIds,
                        res.locationId,
                    ];
                }
            }
        }
    }

    async function onLocationSelect(id: string) {
        selectedLocationIds = [id];
        const locations = await locationsPromise;
        const l = locations.find((x: Location) => x.id === id);
        if (l) {
            const parts = [l.name];
            if (l.roomId) parts.push(l.roomId);
            if (l.street) {
                let s = l.street;
                if (l.houseNumber) s += ` ${l.houseNumber}`;
                if (l.addressSuffix) s += `, ${l.addressSuffix}`;
                parts.push(s);
            }
            if (l.zip || l.city)
                parts.push(`${l.zip ?? ""} ${l.city ?? ""}`.trim());
            if (l.state) parts.push(l.state);
            if (l.country) parts.push(l.country);
            freeTextLocation = parts.filter(Boolean).join(", ");
        } else {
            freeTextLocation = "";
        }
    }

    function addReminder() {
        reminders = [...reminders, { method: "popup", minutes: 10 }];
    }

    function removeReminder(index: number) {
        reminders = reminders.filter((_, i) => i !== index);
    }
</script>

<div class="max-w-3xl mx-auto px-4 py-8">
    <Breadcrumb
        feature="events"
        current={initialData?.summary ?? "New Event"}
    />

    <div class="flex justify-between items-center mb-6">
        <h1 class="text-3xl font-bold">
            {isUpdating ? "Edit Event" : "Create New Event"}
        </h1>
        {#if isUpdating && initialData}
            <AsyncButton
                type="button"
                variant="destructive"
                loading={deleteEventAction.pending}
                onclick={async () => {
                    await handleDelete({
                        ids: [initialData.id],
                        deleteFn: deleteEventAction,
                        itemName: "event",
                    });
                    goto("/events");
                }}
            >
                Delete
            </AsyncButton>
        {/if}
    </div>

    <form
        {...remoteFunction
            .preflight(validationSchema)
            .enhance(async ({ submit }: any) => {
                console.log("--- EventForm submission started ---");
                try {
                    const result: any = await submit();
                    console.log(
                        "--- EventForm submission result ---",
                        JSON.stringify(result, null, 2),
                    );
                    if (result?.error) {
                        toast.error(
                            result.error.message ||
                                "Oh no! Something went wrong",
                        );
                        return;
                    }
                    toast.success("Successfully Saved!");
                    goto("/events");
                } catch (error: any) {
                    console.error("--- EventForm submission catch ---", error);
                    toast.error(
                        error?.message || "Oh no! Something went wrong",
                    );
                }
            })}
        class="space-y-6"
    >
        {#if isUpdating && initialData}
            <input {...getField("id").as("hidden", initialData.id)} />
        {/if}

        {#if computedStart}
            <input {...getField("start").as("hidden", computedStart)} />
        {/if}
        {#if computedEnd}
            <input {...getField("end").as("hidden", computedEnd)} />
        {/if}

        <input {...getField("remindersJson").as("hidden", remindersJson)} />
        <input {...getField("isPublic").as("hidden", isPublic.toString())} />
        <input
            {...getField("guestsCanInviteOthers").as(
                "hidden",
                guestsCanInviteOthers.toString(),
            )}
        />
        <input
            {...getField("guestsCanModify").as(
                "hidden",
                guestsCanModify.toString(),
            )}
        />
        <input
            {...getField("guestsCanSeeOtherGuests").as(
                "hidden",
                guestsCanSeeOtherGuests.toString(),
            )}
        />

        <!-- Recurrence Hidden Input -->
        {#if recurrenceRule}
            <input
                {...getField("recurrence").as("hidden", hiddenRecurrenceRule)}
            />
        {/if}

        <!-- Tags Hidden Input -->
        {#if hiddenTagsString}
            <input {...getField("tags").as("hidden", hiddenTagsString)} />
        {/if}

        <div class="bg-white shadow rounded-lg p-6 space-y-4">
            <h2 class="text-xl font-semibold mb-4 border-b pb-2">
                Basic Information
            </h2>

            <div>
                <label
                    for="summary"
                    class="block text-sm font-medium text-gray-700 mb-1"
                >
                    Title <span class="text-red-500">*</span>
                </label>
                <input
                    {...getField("summary").as("text")}
                    required
                    value={getField("summary").value() ??
                        initialData?.summary ??
                        ""}
                    class="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 {(getField(
                        'summary',
                    ).issues()?.length ?? 0) > 0
                        ? 'border-red-500'
                        : 'border-gray-300'}"
                    placeholder="Event title"
                    onblur={() => remoteFunction.validate()}
                />
                {#each getField("summary").issues() ?? [] as issue}
                    <p class="mt-1 text-sm text-red-600">{issue.message}</p>
                {/each}
            </div>

            <div>
                <label
                    for="description"
                    class="block text-sm font-medium text-gray-700 mb-1"
                    >Description</label
                >
                <div class="prose max-w-none">
                    <RichTextEditor bind:value={descriptionValue} />
                    {#if hiddenDescription}
                        <input
                            {...getField("description").as(
                                "hidden",
                                hiddenDescription,
                            )}
                        />
                    {/if}
                </div>
            </div>

            <div>
                <TagInput
                    bind:value={tagsString}
                    label="Tags"
                    placeholder="e.g. Series, Workshop, Marketing"
                />
            </div>

            <div>
                <span class="block text-sm font-medium text-gray-700 mb-2"
                    >Resources (Optional)</span
                >
                {#await resourcesPromise}
                    <p class="text-sm text-gray-500">Loading resources...</p>
                {:then resources}
                    <div
                        class="space-y-1 border rounded-md p-4 max-h-64 overflow-y-auto bg-gray-50"
                    >
                        {#each resources as resource}
                            <label
                                class="flex items-center gap-2 py-1 px-2 hover:bg-white rounded transition-colors"
                                style="padding-left: {resource.level * 24 +
                                    8}px"
                            >
                                <input
                                    {...getField("resourceIds").as(
                                        "checkbox",
                                        resource.id,
                                    )}
                                    name={undefined}
                                    class="w-4 h-4 text-blue-600 flex-shrink-0"
                                    checked={selectedResourceIds.includes(
                                        resource.id,
                                    )}
                                    onclick={() => toggleResource(resource.id)}
                                />
                                <span
                                    class="text-sm {resource.level === 0
                                        ? 'font-semibold'
                                        : 'text-gray-600'}"
                                    >{resource.name}</span
                                >
                                <span class="text-xs text-gray-500"
                                    >({resource.type})</span
                                >
                            </label>
                        {/each}
                    </div>
                {/await}
                <input
                    {...getField("resourceIds").as(
                        "hidden",
                        JSON.stringify(selectedResourceIds),
                    )}
                />
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                    <label
                        for="categoryBerlinDotDe"
                        class="block text-sm font-medium text-gray-700 mb-1"
                    >
                        Berlin.de Category
                    </label>
                    <select
                        {...getField("categoryBerlinDotDe").as("text")}
                        value={getField("categoryBerlinDotDe").value() ??
                            initialData?.categoryBerlinDotDe ??
                            ""}
                        class="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 border-gray-300"
                    >
                        <option value="">-- Select Category --</option>
                        {#each BERLIN_DE_CATEGORIES as cat}
                            <option value={cat}>{cat}</option>
                        {/each}
                    </select>
                </div>
                <div>
                    <label
                        for="ticketPrice"
                        class="block text-sm font-medium text-gray-700 mb-1"
                    >
                        Ticket Price
                    </label>
                    <input
                        {...getField("ticketPrice").as("text")}
                        value={getField("ticketPrice").value() ??
                            initialData?.ticketPrice ??
                            ""}
                        class="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 border-gray-300"
                        placeholder="e.g. 15.00 EUR"
                    />
                </div>
            </div>

            <div>
                <span class="block text-sm font-medium text-gray-700 mb-2"
                    >Location</span
                >
                <div class="flex items-center gap-2 mb-2">
                    <input
                        id="useFreeTextLocation"
                        type="checkbox"
                        checked={useFreeTextLocation}
                        onclick={() =>
                            (useFreeTextLocation = !useFreeTextLocation)}
                        class="w-4 h-4 text-blue-600"
                    />
                    <label
                        for="useFreeTextLocation"
                        class="text-sm text-gray-700"
                        >Use custom location text</label
                    >
                </div>
                {#if useFreeTextLocation}
                    <input
                        {...getField("location").as("text")}
                        value={freeTextLocation}
                        oninput={(e) =>
                            (freeTextLocation = e.currentTarget.value)}
                        class="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 border-gray-300"
                        placeholder="Enter custom location"
                        onblur={() => remoteFunction.validate()}
                    />
                {:else}
                    {#await locationsPromise}
                        <p class="text-sm text-gray-500">
                            Loading locations...
                        </p>
                    {:then locations}
                        <!-- Using Multi-Location Selector -->
                        <LocationSelector
                            {locations}
                            bind:selectedIds={selectedLocationIds}
                        />
                        <!-- Populate freeTextLocation based on selection if needed, or leave independent -->
                    {/await}
                {/if}
                <input
                    {...getField("locationIds").as(
                        "hidden",
                        JSON.stringify(
                            useFreeTextLocation
                                ? []
                                : (selectedLocationIds ?? []),
                        ),
                    )}
                />
            </div>
        </div>

        <div class="bg-white shadow rounded-lg p-6 space-y-4">
            <h2 class="text-xl font-semibold mb-4 border-b pb-2">
                Date & Time
            </h2>

            <div class="flex items-center gap-2">
                <input
                    id="isAllDay"
                    type="checkbox"
                    checked={isAllDay}
                    onclick={() => (isAllDay = !isAllDay)}
                    class="w-4 h-4 text-blue-600"
                />
                <label for="isAllDay" class="text-sm font-medium text-gray-700"
                    >All-day event</label
                >
            </div>

            <div class="grid grid-cols-2 gap-4">
                <div>
                    <label
                        for="startDateInput"
                        class="block text-sm font-medium text-gray-700 mb-1"
                        >Start Date <span class="text-red-500">*</span></label
                    >
                    <input
                        type="date"
                        required
                        bind:value={startDateInput}
                        onchange={updateEndDateTime}
                        class="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 border-gray-300"
                    />
                </div>
                {#if !isAllDay}
                    <div>
                        <label
                            for="startTimeInput"
                            class="block text-sm font-medium text-gray-700 mb-1"
                            >Start Time <span class="text-red-500">*</span
                            ></label
                        >
                        <input
                            type="time"
                            required
                            bind:value={startTimeInput}
                            onchange={updateEndDateTime}
                            class="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 border-gray-300"
                        />
                    </div>
                {/if}
            </div>

            <div class="flex items-center gap-2">
                <input
                    id="hasEndTime"
                    type="checkbox"
                    checked={hasEndTime}
                    onclick={() => (hasEndTime = !hasEndTime)}
                    class="w-4 h-4 text-blue-600"
                />
                <label
                    for="hasEndTime"
                    class="text-sm font-medium text-gray-700"
                    >Add end time</label
                >
            </div>

            {#if hasEndTime}
                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <label
                            for="endDateInput"
                            class="block text-sm font-medium text-gray-700 mb-1"
                            >End Date</label
                        >
                        <input
                            type="date"
                            bind:value={endDateInput}
                            placeholder={startDateInput}
                            class="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 border-gray-300"
                        />
                    </div>
                    {#if !isAllDay}
                        <div>
                            <label
                                for="endTimeInput"
                                class="block text-sm font-medium text-gray-700 mb-1"
                                >End Time</label
                            >
                            <input
                                type="time"
                                bind:value={endTimeInput}
                                placeholder={getDefaultEndTime()}
                                class="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 border-gray-300"
                            />
                        </div>
                    {/if}
                </div>
            {/if}

            <!-- Recurrence Button -->
            <div class="pt-4 border-t">
                <button
                    type="button"
                    class="flex items-center gap-2 text-sm text-gray-700 hover:text-gray-900"
                    onclick={() => (showRecurrenceDialog = true)}
                >
                    <CalendarClock size={16} />
                    <span>{recurrenceText}</span>
                </button>
            </div>
        </div>

        <RecurrenceDialog
            bind:open={showRecurrenceDialog}
            bind:value={recurrenceRule}
        />

        <div class="bg-white shadow rounded-lg p-6 space-y-4">
            <h2 class="text-xl font-semibold mb-4 border-b pb-2">
                Guest Options & Reminders
            </h2>

            <div class="space-y-3">
                <label class="flex items-center gap-2">
                    <input
                        type="checkbox"
                        bind:checked={guestsCanInviteOthers}
                        class="w-4 h-4 text-blue-600"
                    />
                    <span class="text-sm text-gray-700"
                        >Guests can invite others</span
                    >
                </label>
                <label class="flex items-center gap-2">
                    <input
                        type="checkbox"
                        bind:checked={guestsCanModify}
                        class="w-4 h-4 text-blue-600"
                    />
                    <span class="text-sm text-gray-700"
                        >Guests can modify event</span
                    >
                </label>
                <label class="flex items-center gap-2">
                    <input
                        type="checkbox"
                        bind:checked={guestsCanSeeOtherGuests}
                        class="w-4 h-4 text-blue-600"
                    />
                    <span class="text-sm text-gray-700"
                        >Guests can see other guests</span
                    >
                </label>
                <label class="flex items-center gap-2">
                    <input
                        type="checkbox"
                        bind:checked={isPublic}
                        class="w-4 h-4 text-blue-600"
                    />
                    <span class="text-sm text-gray-700"
                        >Make this event public</span
                    >
                </label>
            </div>

            <div class="mt-6">
                <h3 class="text-sm font-medium text-gray-700 mb-2">
                    Reminders
                </h3>
                <label class="flex items-center gap-2 mb-4">
                    <input
                        type="checkbox"
                        bind:checked={useDefaultReminders}
                        class="w-4 h-4 text-blue-600"
                    />
                    <span class="text-sm text-gray-700"
                        >Use default reminders</span
                    >
                </label>

                <input
                    {...getField("reminders.useDefault").as(
                        "hidden",
                        useDefaultReminders?.toString() ?? "true",
                    )}
                />

                {#if !useDefaultReminders}
                    <div class="space-y-3">
                        {#each reminders as reminder, i}
                            <div class="flex gap-2 items-center">
                                <div class="flex-1">
                                    <select
                                        bind:value={reminder.method}
                                        class="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                                    >
                                        <option value="popup"
                                            >Notification</option
                                        >
                                        <option value="email">Email</option>
                                    </select>
                                </div>
                                <div class="flex-1">
                                    <input
                                        type="number"
                                        bind:value={reminder.minutes}
                                        class="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                                        min="0"
                                    />
                                </div>
                                <button
                                    type="button"
                                    class="p-2 text-red-600 hover:bg-red-50 rounded-md"
                                    onclick={() => {
                                        reminders = reminders.filter(
                                            (_, idx) => idx !== i,
                                        );
                                    }}
                                >
                                    &times;
                                </button>
                            </div>
                        {/each}
                        <button
                            type="button"
                            class="text-sm text-blue-600 hover:text-blue-800"
                            onclick={() => {
                                reminders = [
                                    ...reminders,
                                    { method: "popup", minutes: 10 },
                                ];
                            }}
                        >
                            + Add reminder
                        </button>
                    </div>
                {/if}
            </div>
        </div>

        <div class="bg-white shadow rounded-lg p-6 space-y-4">
            <h2 class="text-xl font-semibold mb-4 border-b pb-2">Contacts</h2>
            <ContactManager
                type="event"
                entityId={initialData?.id}
                onchange={(ids: string[]) => (selectedContactIds = ids)}
            />
            <input
                {...getField("contactIds").as(
                    "hidden",
                    JSON.stringify(selectedContactIds ?? []),
                )}
            />
        </div>

        <div class="flex gap-3 pt-4">
            <AsyncButton
                type="submit"
                loadingLabel="Saving..."
                loading={remoteFunction.pending}
                class="px-8"
            >
                {isUpdating ? "Save Changes" : "Create Event"}
            </AsyncButton>
            <Button variant="secondary" href="/events" size="default">
                Cancel
            </Button>
        </div>
    </form>
</div>
