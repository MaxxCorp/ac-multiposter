<script lang="ts">
	import { page } from "$app/state";
	import { goto } from "$app/navigation";
	import { readEvent } from "./read.remote";
	import { updateEvent } from "./update.remote";
	import { deleteEvents } from "./delete.remote";
	import {
		listResourcesWithHierarchy,
		type ResourceWithHierarchy,
	} from "../../resources/list-with-hierarchy.remote";
	import { listLocations } from "../../locations/list.remote";
	import Breadcrumb from "$lib/components/ui/Breadcrumb.svelte";
	import AsyncButton from "$lib/components/ui/AsyncButton.svelte";
	import ErrorSection from "$lib/components/ui/ErrorSection.svelte";
	import LoadingSection from "$lib/components/ui/LoadingSection.svelte";
	import { toast } from "svelte-sonner";
	import { updateEventSchema } from "$lib/validations/event";
	import { Button } from "$lib/components/ui/button";
	import { handleDelete } from "$lib/hooks/handleDelete.svelte";

	const browserTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

	// Await the event data in the template
	const eventQuery = readEvent(page.params.id || "");

	// Resource and location state
	let resourcesPromise = listResourcesWithHierarchy();
	let locationsPromise = listLocations();
	let selectedResourceIds = $state<string[]>([]);
	let useFreeTextLocation = $state(false);
	let selectedLocationId = $state<string>("");
	let freeTextLocation = $state<string>("");

	// Form state - user interactions
	let isAllDay = $state(false);
	let hasEndTime = $state(false);
	let useDefaultReminders = $state(true);
	let reminders = $state<Array<{ method: string; minutes: number }>>([
		{ method: "popup", minutes: 10 },
	]);
	let initialized = $state(false); // Track if form has been initialized

	// Helper fields for date/time input
	let startDateInput = $state("");
	let startTimeInput = $state("");
	let endDateInput = $state("");
	let endTimeInput = $state("");
	let timeZone = $state(browserTimezone);

	// Derive schema fields from user inputs
	const startDate = $derived(isAllDay ? startDateInput : "");
	const endDate = $derived(isAllDay && hasEndTime ? endDateInput : "");
	const startDateTime = $derived(
		!isAllDay && startDateInput && startTimeInput
			? `${startDateInput}T${startTimeInput}:00`
			: "",
	);
	const endDateTime = $derived(
		!isAllDay && hasEndTime && endDateInput && endTimeInput
			? `${endDateInput}T${endTimeInput}:00`
			: "",
	);
	const startTimeZone = $derived(!isAllDay && timeZone ? timeZone : "");
	const endTimeZone = $derived(!isAllDay && timeZone ? timeZone : "");

	// Initialize form from loaded event data
	$effect(() => {
		eventQuery.then((event) => {
			if (!event || initialized) return; // Already initialized

			isAllDay = !event.startDateTime && !!event.startDate;
			hasEndTime = !!(event.endDateTime || event.endDate);
			timeZone = event.startTimeZone || browserTimezone;

			// Initialize resources
			if (event.resourceIds) {
				selectedResourceIds = event.resourceIds;
			}

			// Initialize location mode
			if (event.location) {
				freeTextLocation = event.location;
				// Check if location matches any saved location
				locationsPromise.then((locations) => {
					const matchingLocation = locations.find((l) => {
						const locationStr = [l.name, l.roomId, l.address]
							.filter(Boolean)
							.join(", ");
						return (
							locationStr === event.location ||
							l.name === event.location
						);
					});
					if (matchingLocation) {
						selectedLocationId = matchingLocation.id;
						useFreeTextLocation = false;
					} else {
						useFreeTextLocation = true;
					}
				});
			}

			// Initialize date/time inputs based on event type
			if (isAllDay) {
				// All-day event: use startDate/endDate
				startDateInput = event.startDate || "";
				endDateInput = event.endDate || "";
			} else {
				// Timed event: use startDateTime/endDateTime
				if (event.startDateTime) {
					const startParsed = parseDateTime(event.startDateTime);
					const endParsed = parseDateTime(event.endDateTime);
					startDateInput = startParsed.date;
					startTimeInput = startParsed.time;
					endDateInput = endParsed.date;
					endTimeInput = endParsed.time;
				}
			}
			if (event.reminders) {
				useDefaultReminders = event.reminders.useDefault ?? true;
				if (event.reminders.overrides?.length) {
					reminders = event.reminders.overrides;
				}
			}

			initialized = true; // Mark as initialized
		});
	});

	// Prefill location from first selected resource
	$effect(() => {
		if (
			selectedResourceIds.length > 0 &&
			!useFreeTextLocation &&
			!selectedLocationId
		) {
			Promise.all([resourcesPromise, locationsPromise]).then(
				([resources, locations]) => {
					const firstResource = resources.find(
						(r) => r.id === selectedResourceIds[0],
					);
					if (firstResource?.locationId) {
						selectedLocationId = firstResource.locationId;
						// Also set the location text immediately
						const selectedLocation = locations.find(
							(l) => l.id === firstResource.locationId,
						);
						if (selectedLocation) {
							const locationParts = [selectedLocation.name];
							if (selectedLocation.roomId)
								locationParts.push(selectedLocation.roomId);
							if (selectedLocation.address)
								locationParts.push(selectedLocation.address);
							freeTextLocation = locationParts.join(", ");
						}
					}
				},
			);
		}
	});

	function addReminder() {
		reminders = [...reminders, { method: "popup", minutes: 10 }];
	}

	function removeReminder(index: number) {
		reminders = reminders.filter((_, i) => i !== index);
	}

	// Helper to parse datetime for inputs
	function parseDateTime(dt: string | Date | null | undefined): {
		date: string;
		time: string;
	} {
		if (!dt) return { date: "", time: "" };
		const isoString =
			typeof dt === "string" ? dt : new Date(dt).toISOString();
		const [date, timeWithZone] = isoString.split("T");
		const time = timeWithZone?.substring(0, 5) || "";
		return { date, time };
	}
</script>

<div class="container mx-auto px-4 py-8">
	{#await eventQuery}
		<LoadingSection message="Loading event..." />
	{:then event}
		{#if event}
			<div class="max-w-4xl mx-auto">
				<Breadcrumb feature="events" current={event.summary} />
				<div class="bg-white shadow rounded-lg p-6 space-y-4">
					<div class="flex justify-between items-start mb-6">
						<div>
							<h1 class="text-3xl font-bold mb-2">
								{event.summary}
							</h1>
							<p class="text-sm text-gray-500">
								Created: {new Date(
									event.createdAt,
								).toLocaleString()}
								{#if event.updatedAt !== event.createdAt}
									• Updated: {new Date(
										event.updatedAt,
									).toLocaleString()}
								{/if}
							</p>
						</div>
						<div class="flex gap-2">
							<AsyncButton
								type="button"
								loadingLabel="Deleting..."
								loading={deleteEvents.pending}
								variant="destructive"
								onclick={async () => {
									await handleDelete({
										ids: [event.id],
										deleteFn: deleteEvents,
										itemName: "event",
									});
									goto("/events");
								}}
							>
								Delete
							</AsyncButton>
						</div>
					</div>

					<h2 class="text-xl font-semibold mb-4">Edit Event</h2>
					<form
						{...updateEvent
							.preflight(updateEventSchema)
							.enhance(async ({ submit }) => {
								try {
									const result: any = await submit();
									if (result?.error) {
										toast.error(
											result.error.message ||
												"Oh no! Something went wrong",
										);
										return;
									}
									toast.success("Successfully saved!");
									goto("/events");
								} catch (error: unknown) {
									const err = error as { message?: string };
									toast.error(
										err?.message ||
											"Oh no! Something went wrong",
									);
								}
							})}
						class="space-y-4"
					>
						<!-- Hidden schema fields that get synced by $effect -->
						<input
							{...updateEvent.fields.id.as("hidden", event.id)}
						/>
						{#if startDate}
							<input
								{...updateEvent.fields.startDate.as(
									"hidden",
									startDate,
								)}
							/>
						{/if}
						{#if startDateTime}
							<input
								{...updateEvent.fields.startDateTime.as(
									"hidden",
									startDateTime,
								)}
							/>
						{/if}
						{#if startTimeZone}
							<input
								{...updateEvent.fields.startTimeZone.as(
									"hidden",
									startTimeZone,
								)}
							/>
						{/if}
						{#if endDate}
							<input
								{...updateEvent.fields.endDate.as(
									"hidden",
									endDate,
								)}
							/>
						{/if}
						{#if endDateTime}
							<input
								{...updateEvent.fields.endDateTime.as(
									"hidden",
									endDateTime,
								)}
							/>
						{/if}
						{#if endTimeZone}
							<input
								{...updateEvent.fields.endTimeZone.as(
									"hidden",
									endTimeZone,
								)}
							/>
						{/if}

						<!-- Reminders (Form Spread) -->
						<input
							{...updateEvent.fields.reminders.useDefault.as(
								"checkbox",
							)}
							type="hidden"
							value={useDefaultReminders.toString()}
						/>
						{#if !useDefaultReminders}
							{#each reminders as reminder, index}
								<input
									{...updateEvent.fields.reminders.overrides[
										index
									].method.as("text")}
									type="hidden"
									value={reminder.method}
								/>
								<input
									{...updateEvent.fields.reminders.overrides[
										index
									].minutes.as("number")}
									type="hidden"
									value={reminder.minutes}
								/>
							{/each}
						{/if}

						<!-- Summary -->
						<div>
							<label
								for="summary"
								class="block text-sm font-medium text-gray-700 mb-1"
							>
								Event Title <span class="text-red-500">*</span>
							</label>
							<input
								{...updateEvent.fields.summary.as("text")}
								id="summary"
								value={updateEvent.fields.summary.value() ??
									event.summary}
								placeholder="Team Meeting"
								class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 {(updateEvent.fields.summary.issues()
									?.length ?? 0) > 0
									? 'border-red-500'
									: 'border-gray-300'}"
								onblur={() => updateEvent.validate()}
							/>
							{#each updateEvent.fields.summary.issues() ?? [] as issue}
								<p class="mt-1 text-sm text-red-600">
									{issue.message}
								</p>
							{/each}
						</div>

						<!-- Description -->
						<div>
							<label
								for="description"
								class="block text-sm font-medium text-gray-700 mb-1"
							>
								Description
							</label>
							<textarea
								{...updateEvent.fields.description.as("text")}
								id="description"
								value={updateEvent.fields.description.value() ??
									event.description}
								placeholder="Discuss project progress..."
								rows="4"
								class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
								onblur={() => updateEvent.validate()}
							></textarea>
						</div>

						<!-- Resources Section -->
						{#await resourcesPromise then resources}
							<div>
								<span
									class="block text-sm font-medium text-gray-700 mb-2"
								>
									Resources (Optional)
								</span>
								<div
									class="space-y-1 border rounded-md p-4 max-h-64 overflow-y-auto bg-gray-50"
								>
									{#each resources as resource}
										<label
											class="flex items-center gap-2 py-1 px-2 hover:bg-white rounded transition-colors"
											style="padding-left: {resource.level *
												24 +
												8}px"
										>
											{#if resource.level > 0}
												<span
													class="text-gray-400 text-xs mr-1"
													>└─</span
												>
											{/if}
											<input
												{...updateEvent.fields.resourceIds.as(
													"checkbox",
													resource.id,
												)}
												class="w-4 h-4 text-blue-600 flex-shrink-0"
												checked={selectedResourceIds.includes(
													resource.id,
												)}
												onclick={() => {
													if (
														selectedResourceIds.includes(
															resource.id,
														)
													) {
														selectedResourceIds =
															selectedResourceIds.filter(
																(id) =>
																	id !==
																	resource.id,
															);
													} else {
														selectedResourceIds = [
															...selectedResourceIds,
															resource.id,
														];
													}
												}}
											/>
											<span
												class="text-sm"
												class:font-semibold={resource.level ===
													0}
												class:text-gray-600={resource.level >
													0}
											>
												{resource.name}
											</span>
											<span class="text-xs text-gray-500"
												>({resource.type})</span
											>
										</label>
									{/each}
									{#if resources.length === 0}
										<p class="text-sm text-gray-500">
											No resources available
										</p>
									{/if}
								</div>
							</div>
						{/await}
						<!-- Location Section -->
						<div>
							<span
								class="block text-sm font-medium text-gray-700 mb-2"
							>
								Location
							</span>
							<div class="flex items-center gap-2 mb-2">
								<input
									id="useFreeTextLocation"
									type="checkbox"
									checked={useFreeTextLocation}
									onclick={() =>
										(useFreeTextLocation =
											!useFreeTextLocation)}
									class="w-4 h-4 text-blue-600"
								/>
								<label
									for="useFreeTextLocation"
									class="text-sm text-gray-700"
								>
									Use custom location text
								</label>
							</div>
							{#if useFreeTextLocation}
								<input
									{...updateEvent.fields.location.as("text")}
									id="location"
									value={updateEvent.fields.location.value() ??
										freeTextLocation}
									oninput={(e) =>
										(freeTextLocation =
											e.currentTarget.value)}
									placeholder="Enter custom location"
									class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
									onblur={() => updateEvent.validate()}
								/>
							{:else}
								{#await locationsPromise then locations}
									<select
										id="locationSelect"
										value={selectedLocationId}
										onchange={async (e) => {
											selectedLocationId =
												e.currentTarget.value;
											const selectedLocation =
												locations.find(
													(l) =>
														l.id ===
														selectedLocationId,
												);
											if (selectedLocation) {
												const locationParts = [
													selectedLocation.name,
												];
												if (selectedLocation.roomId)
													locationParts.push(
														selectedLocation.roomId,
													);
												if (selectedLocation.address)
													locationParts.push(
														selectedLocation.address,
													);
												freeTextLocation =
													locationParts.join(", ");
											}
										}}
										class="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 border-gray-300"
									>
										<option value=""
											>-- Select a location --</option
										>
										{#each locations as location}
											<option value={location.id}>
												{location.name}{#if location.roomId}
													- {location.roomId}{/if}
											</option>
										{/each}
									</select>
									<!-- Hidden input to pass the constructed location string -->
									{#if selectedLocationId}
										<input
											{...updateEvent.fields.location.as(
												"hidden",
												freeTextLocation,
											)}
										/>
									{/if}
								{/await}
							{/if}
						</div>

						<!-- Berlin.de Category -->
						<div>
							<label
								for="categoryBerlinDotDe"
								class="block text-sm font-medium text-gray-700 mb-1"
							>
								Berlin.de Category
							</label>
							<select
								{...updateEvent.fields.categoryBerlinDotDe.as(
									"select",
								)}
								value={updateEvent.fields.categoryBerlinDotDe.value() ??
									event.categoryBerlinDotDe ??
									""}
								class="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 {(updateEvent.fields.categoryBerlinDotDe.issues()
									?.length ?? 0) > 0
									? 'border-red-500'
									: 'border-gray-300'}"
								onblur={() => updateEvent.validate()}
							>
								<option value="">-- Bitte wählen --</option>
								<option value="Ausstellungen"
									>Ausstellungen</option
								>
								<option value="Bälle & Galas"
									>Bälle & Galas</option
								>
								<option value="Bildung & Vorträge"
									>Bildung & Vorträge</option
								>
								<option value="Festivals">Festivals</option>
								<option value="Jazz & Blues"
									>Jazz & Blues</option
								>
								<option value="Kabarett & Comedy"
									>Kabarett & Comedy</option
								>
								<option value="Kinderveranstaltungen"
									>Kinderveranstaltungen</option
								>
								<option value="Klassische Konzerte"
									>Klassische Konzerte</option
								>
								<option value="Literatur">Literatur</option>
								<option value="Musical">Musical</option>
								<option value="Oper & Tanz">Oper & Tanz</option>
								<option value="Pop, Rock & HipHop"
									>Pop, Rock & HipHop</option
								>
								<option value="Schlager & Volksmusik"
									>Schlager & Volksmusik</option
								>
								<option value="Show">Show</option>
								<option value="Sport">Sport</option>
								<option value="Theater">Theater</option>
								<option value="Vermischtes">Vermischtes</option>
								<option value="Volksfeste & Straßenfeste"
									>Volksfeste & Straßenfeste</option
								>
								<option value="Wirtschaft">Wirtschaft</option>
								<option value="Wissenschaft"
									>Wissenschaft</option
								>
							</select>
							{#each updateEvent.fields.categoryBerlinDotDe.issues() ?? [] as issue}
								<p class="mt-1 text-sm text-red-600">
									{issue.message}
								</p>
							{/each}
						</div>

						<!-- Ticket Price -->
						<div>
							<label
								for="ticketPrice"
								class="block text-sm font-medium text-gray-700 mb-1"
							>
								Ticket Price
							</label>
							<input
								id="ticketPrice"
								{...updateEvent.fields.ticketPrice.as("text")}
								value={updateEvent.fields.ticketPrice.value() ??
									event.ticketPrice ??
									""}
								class="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 {(updateEvent.fields.ticketPrice.issues()
									?.length ?? 0) > 0
									? 'border-red-500'
									: 'border-gray-300'}"
								placeholder="e.g., Free, €15, €10-€20"
								onblur={() => updateEvent.validate()}
							/>
							{#each updateEvent.fields.ticketPrice.issues() ?? [] as issue}
								<p class="mt-1 text-sm text-red-600">
									{issue.message}
								</p>
							{/each}
						</div>

						<!-- All Day Event Toggle -->
						<div class="flex items-center gap-2">
							<input
								type="checkbox"
								id="isAllDay"
								checked={isAllDay}
								onclick={() => (isAllDay = !isAllDay)}
								class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
							/>
							<label
								for="isAllDay"
								class="text-sm font-medium text-gray-700"
							>
								All Day Event
							</label>
						</div>

						{#if isAllDay}
							<!-- Date fields for all-day events -->
							<div class="grid grid-cols-2 gap-4">
								<div>
									<label
										for="startDateInput"
										class="block text-sm font-medium text-gray-700 mb-1"
									>
										Start Date <span class="text-red-500"
											>*</span
										>
									</label>
									<input
										type="date"
										id="startDateInput"
										value={startDateInput}
										oninput={(e) =>
											(startDateInput =
												e.currentTarget.value)}
										class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
									/>
								</div>
								<div>
									<label
										for="endDateInput"
										class="block text-sm font-medium text-gray-700 mb-1"
									>
										End Date
									</label>
									<input
										type="date"
										id="endDateInput"
										value={endDateInput}
										oninput={(e) =>
											(endDateInput =
												e.currentTarget.value)}
										class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
									/>
								</div>
							</div>
						{:else}
							<!-- Start Date/Time -->
							<div class="grid grid-cols-2 gap-4">
								<div>
									<label
										for="startDateInput"
										class="block text-sm font-medium text-gray-700 mb-1"
									>
										Start Date <span class="text-red-500"
											>*</span
										>
									</label>
									<input
										type="date"
										id="startDateInput"
										value={startDateInput}
										oninput={(e) =>
											(startDateInput =
												e.currentTarget.value)}
										class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
									/>
								</div>
								<div>
									<label
										for="startTimeInput"
										class="block text-sm font-medium text-gray-700 mb-1"
									>
										Start Time <span class="text-red-500"
											>*</span
										>
									</label>
									<input
										type="time"
										id="startTimeInput"
										value={startTimeInput}
										oninput={(e) =>
											(startTimeInput =
												e.currentTarget.value)}
										class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
									/>
								</div>
							</div>

							<!-- End Time Toggle -->
							<div class="flex items-center gap-2">
								<input
									type="checkbox"
									id="hasEndTime"
									checked={hasEndTime}
									onclick={() => (hasEndTime = !hasEndTime)}
									class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
								/>
								<label
									for="hasEndTime"
									class="text-sm font-medium text-gray-700"
								>
									Set End Time
								</label>
							</div>

							{#if hasEndTime}
								<!-- End Date/Time -->
								<div class="grid grid-cols-2 gap-4">
									<div>
										<label
											for="endDateInput"
											class="block text-sm font-medium text-gray-700 mb-1"
										>
											End Date <span class="text-red-500"
												>*</span
											>
										</label>
										<input
											type="date"
											id="endDateInput"
											value={endDateInput}
											oninput={(e) =>
												(endDateInput =
													e.currentTarget.value)}
											class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
										/>
									</div>
									<div>
										<label
											for="endTimeInput"
											class="block text-sm font-medium text-gray-700 mb-1"
										>
											End Time <span class="text-red-500"
												>*</span
											>
										</label>
										<input
											type="time"
											id="endTimeInput"
											value={endTimeInput}
											oninput={(e) =>
												(endTimeInput =
													e.currentTarget.value)}
											class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
										/>
									</div>
								</div>
							{/if}

							<!-- Time Zone -->
							<div>
								<label
									for="timeZone"
									class="block text-sm font-medium text-gray-700 mb-1"
								>
									Time Zone
								</label>
								<input
									type="text"
									id="timeZone"
									value={timeZone}
									oninput={(e) =>
										(timeZone = e.currentTarget.value)}
									placeholder="America/New_York"
									class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
								/>
							</div>
						{/if}

						<!-- Event Type -->
						<div>
							<label
								for="eventType"
								class="block text-sm font-medium text-gray-700 mb-1"
							>
								Event Type <span class="text-red-500">*</span>
							</label>
							<select
								{...updateEvent.fields.eventType.as("select")}
								id="eventType"
								value={updateEvent.fields.eventType.value() ??
									event.eventType}
								class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
							>
								<option value="default">Default</option>
								<option value="outOfOffice"
									>Out of Office</option
								>
								<option value="focusTime">Focus Time</option>
								<option value="workingLocation"
									>Working Location</option
								>
							</select>
						</div>

						<!-- Status -->
						<div>
							<label
								for="status"
								class="block text-sm font-medium text-gray-700 mb-1"
							>
								Status <span class="text-red-500">*</span>
							</label>
							<select
								{...updateEvent.fields.status.as("select")}
								id="status"
								value={updateEvent.fields.status.value() ??
									event.status}
								class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
							>
								<option value="confirmed">Confirmed</option>
								<option value="tentative">Tentative</option>
								<option value="cancelled">Cancelled</option>
							</select>
						</div>

						<!-- Visibility -->
						<div>
							<label
								for="visibility"
								class="block text-sm font-medium text-gray-700 mb-1"
							>
								Visibility
							</label>
							<select
								{...updateEvent.fields.visibility.as("select")}
								id="visibility"
								value={updateEvent.fields.visibility.value() ??
									event.visibility}
								class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
							>
								<option value="default">Default</option>
								<option value="public">Public</option>
								<option value="private">Private</option>
								<option value="confidential"
									>Confidential</option
								>
							</select>
						</div>

						<!-- Transparency (Show As) -->
						<div>
							<label
								for="transparency"
								class="block text-sm font-medium text-gray-700 mb-1"
							>
								Show As
							</label>
							<select
								{...updateEvent.fields.transparency.as(
									"select",
								)}
								id="transparency"
								value={updateEvent.fields.transparency.value() ??
									event.transparency}
								class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
							>
								<option value="opaque">Busy</option>
								<option value="transparent">Free</option>
							</select>
						</div>

						<!-- Color -->
						<div>
							<label
								for="colorId"
								class="block text-sm font-medium text-gray-700 mb-1"
							>
								Color
							</label>
							<select
								{...updateEvent.fields.colorId.as("select")}
								id="colorId"
								value={updateEvent.fields.colorId.value() ??
									event.colorId}
								class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
							>
								<option value="">None</option>
								{#each Array.from( { length: 11 }, (_, i) => String(i + 1), ) as color}
									<option value={color}>Color {color}</option>
								{/each}
							</select>
						</div>

						<!-- Reminders Section -->
						<div class="border-t pt-6">
							<h2 class="text-lg font-semibold mb-4">
								Reminders
							</h2>

							<div class="space-y-4">
								<div class="flex items-center gap-2 mb-4">
									<input
										type="checkbox"
										id="useDefaultReminders"
										checked={useDefaultReminders}
										onclick={() =>
											(useDefaultReminders =
												!useDefaultReminders)}
										class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
									/>
									<label
										for="useDefaultReminders"
										class="text-sm text-gray-700"
									>
										Use default reminders
									</label>
								</div>

								{#if !useDefaultReminders}
									{#each reminders as reminder, index}
										<div class="flex gap-2 items-start">
											<select
												value={reminder.method}
												oninput={(e) => {
													reminders[index].method =
														e.currentTarget.value;
													reminders = reminders; // trigger reactivity
												}}
												class="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
											>
												<option value="email"
													>Email</option
												>
												<option value="popup"
													>Popup</option
												>
											</select>

											<input
												type="number"
												value={reminder.minutes}
												oninput={(e) => {
													reminders[index].minutes =
														parseInt(
															e.currentTarget
																.value,
														) || 0;
													reminders = reminders; // trigger reactivity
												}}
												min="0"
												placeholder="Minutes"
												class="w-24 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
											/>

											<span
												class="py-2 text-sm text-gray-600"
												>minutes before</span
											>

											<button
												type="button"
												onclick={() =>
													removeReminder(index)}
												class="px-3 py-2 text-red-600 hover:bg-red-50 rounded-md"
											>
												Remove
											</button>
										</div>
									{/each}

									<button
										type="button"
										onclick={addReminder}
										class="px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-md"
									>
										+ Add Reminder
									</button>
								{/if}
							</div>
						</div>

						<!-- Guest Permissions Section -->
						<div class="border-t pt-6">
							<h2 class="text-lg font-semibold mb-4">
								Guest Permissions
							</h2>

							<div class="space-y-3">
								<div class="flex items-center gap-2">
									<input
										{...updateEvent.fields.guestsCanInviteOthers.as(
											"checkbox",
										)}
										type="checkbox"
										id="guestsCanInviteOthers"
										checked={updateEvent.fields.guestsCanInviteOthers.value() ??
											event.guestsCanInviteOthers}
										class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
									/>
									<label
										for="guestsCanInviteOthers"
										class="text-sm text-gray-700"
									>
										Guests can invite others
									</label>
								</div>

								<div class="flex items-center gap-2">
									<input
										{...updateEvent.fields.guestsCanModify.as(
											"checkbox",
										)}
										type="checkbox"
										id="guestsCanModify"
										checked={updateEvent.fields.guestsCanModify.value() ??
											event.guestsCanModify}
										class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
									/>
									<label
										for="guestsCanModify"
										class="text-sm text-gray-700"
									>
										Guests can modify event
									</label>
								</div>

								<div class="flex items-center gap-2">
									<input
										{...updateEvent.fields.guestsCanSeeOtherGuests.as(
											"checkbox",
										)}
										type="checkbox"
										id="guestsCanSeeOtherGuests"
										checked={updateEvent.fields.guestsCanSeeOtherGuests.value() ??
											event.guestsCanSeeOtherGuests}
										class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
									/>
									<label
										for="guestsCanSeeOtherGuests"
										class="text-sm text-gray-700"
									>
										Guests can see other guests
									</label>
								</div>
							</div>
						</div>

						<!-- Form Actions -->
						<div class="flex gap-3 mt-6">
							<AsyncButton
								type="submit"
								loadingLabel="Saving..."
								loading={updateEvent.pending}
							>
								Save Changes
							</AsyncButton>
							<Button
								variant="secondary"
								href="/events"
								size="default"
							>
								Cancel
							</Button>
						</div>
					</form>
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
				: "Failed to load event"}
			href="/events"
			button="Back to Events"
		/>
	{/await}
</div>
