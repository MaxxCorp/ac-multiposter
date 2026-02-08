<script lang="ts">
	import { listLocations } from "./list.remote";
	import { deleteLocation } from "./[id]/delete.remote";
	import type { Location } from "./list.remote";
	import Breadcrumb from "$lib/components/ui/Breadcrumb.svelte";
	import Button from "$lib/components/ui/button/button.svelte";
	import AsyncButton from "$lib/components/ui/AsyncButton.svelte";
	import { MapPin, Pencil, Trash2 } from "@lucide/svelte";

	import LoadingSection from "$lib/components/ui/LoadingSection.svelte";
	import ErrorSection from "$lib/components/ui/ErrorSection.svelte";
	import BulkActionToolbar from "$lib/components/ui/BulkActionToolbar.svelte";
	import { handleDelete } from "$lib/hooks/handleDelete.svelte";
	import EmptyState from "$lib/components/ui/EmptyState.svelte";

	let itemsPromise = $state<Promise<Location[]>>(listLocations());
	let initializedItems = $state<Location[]>([]);
	let selectedIds = $state<Set<string>>(new Set());

	function isSelected(id: string) {
		return selectedIds.has(id);
	}
	function toggleSelection(id: string) {
		if (selectedIds.has(id)) {
			selectedIds.delete(id);
		} else {
			selectedIds.add(id);
		}
		// Force reactivity
		selectedIds = new Set(selectedIds);
	}
	function selectAll(items: Location[]) {
		selectedIds = new Set(items.map((item) => item.id));
	}
	function deselectAll() {
		selectedIds = new Set();
	}
</script>

<div class="container mx-auto px-4 py-8">
	<div class="max-w-4xl mx-auto">
		<Breadcrumb feature="locations" />
		<div class="bg-white shadow rounded-lg p-6">
			<div
				class="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4"
			>
				<h1 class="text-3xl font-bold flex-shrink-0">Locations</h1>
				<div class="flex-1 flex justify-end w-full md:w-auto">
					<BulkActionToolbar
						selectedCount={selectedIds.size}
						totalCount={initializedItems.length}
						onSelectAll={() => selectAll(initializedItems)}
						onDeselectAll={deselectAll}
						onDelete={async () => {
							await handleDelete({
								ids: [...selectedIds],
								deleteFn: deleteLocation,
								itemName: "location",
							});
							deselectAll();
							itemsPromise = listLocations();
						}}
						newItemHref="/locations/new"
						newItemLabel="+ New Location"
					/>
				</div>
			</div>

			{#await itemsPromise}
				<LoadingSection message="Loading locations..." />
			{:then items}
				{@html (() => {
					initializedItems = items;
					return "";
				})()}

				<div class="grid gap-4">
					{#if items.length === 0}
						<EmptyState
							icon={MapPin}
							title="No Locations"
							description="Get started by creating your first location"
							actionLabel="Create Your First Location"
							actionHref="/locations/new"
						/>
					{:else}
						{#each items as location (location.id)}
							<div class="mb-6 last:mb-0">
								<div
									class="bg-white shadow rounded-lg p-6 flex flex-col sm:flex-row items-start gap-4 transition-shadow"
								>
									<input
										type="checkbox"
										checked={isSelected(location.id)}
										onchange={() =>
											toggleSelection(location.id)}
										class="mt-1 w-4 h-4 text-blue-600"
									/>
									<div class="flex-1">
										<div
											class="flex items-start gap-3 mb-2"
										>
											<div class="flex-1">
												<h2
													class="text-xl font-semibold"
												>
													<a
														href={`/locations/${location.id}`}
														class="hover:underline text-blue-600"
													>
														{location.name}
													</a>
												</h2>
											</div>
										</div>
										<div class="mt-2 text-gray-600">
											<p>
												{[
													[
														location.street,
														location.houseNumber,
													]
														.filter(Boolean)
														.join(" "),
													location.addressSuffix,
												]
													.filter(Boolean)
													.join(", ")}
											</p>
											{#if location.zip || location.city}
												<p>
													{[
														location.zip,
														location.city,
													]
														.filter(Boolean)
														.join(" ")}
												</p>
											{/if}
											{#if location.state || location.country}
												<p
													class="text-sm text-gray-500"
												>
													{[
														location.state,
														location.country,
													]
														.filter(Boolean)
														.join(", ")}
												</p>
											{/if}
											{#if location.roomId}
												<p
													class="text-sm text-gray-500"
												>
													Room: {location.roomId}
												</p>
											{/if}
										</div>
										<div class="mt-3">
											<p
												class="text-xs text-gray-500 mt-3"
											>
												Created: {new Date(
													location.createdAt,
												).toLocaleString()}
											</p>
										</div>
									</div>
									<div class="flex flex-col gap-2 shrink-0">
										<Button
											href={`/locations/${location.id}`}
											variant="default"
											size="default"
											class="flex items-center gap-2 w-[120px] justify-center"
										>
											<Pencil size={16} /> Edit
										</Button>
										<AsyncButton
											variant="destructive"
											size="default"
											loading={false}
											loadingLabel="Deleting..."
											class="flex items-center gap-2 w-[120px] justify-center"
											onclick={async () => {
												const success =
													await handleDelete({
														ids: [location.id],
														deleteFn:
															deleteLocation,
														itemName: "location",
													});
												if (success) {
													deselectAll();
													itemsPromise =
														listLocations();
												}
											}}
										>
											<Trash2 size={16} /> Delete
										</AsyncButton>
									</div>
								</div>
							</div>
						{/each}
					{/if}
				</div>
			{:catch error}
				<ErrorSection
					headline="Failed to load locations"
					message={error?.message || "An unexpected error occurred."}
					href="/locations"
					button="Retry"
				/>
			{/await}
		</div>
	</div>
</div>
