<script lang="ts">
	import { onMount } from 'svelte';
	import { Megaphone } from '@lucide/svelte';
	import Breadcrumb from '$lib/components/ui/Breadcrumb.svelte';
	import BulkActionToolbar from '$lib/components/ui/BulkActionToolbar.svelte';
	import EmptyState from '$lib/components/ui/EmptyState.svelte';
	import ListCard from '$lib/components/ui/ListCard.svelte';
	import { createListPage } from '$lib/hooks/useListPage.svelte';
	import { toast } from '$lib/stores/toast.svelte';

	type HarnessCampaign = {
		id: string;
		userId: string;
		name: string;
		content: Record<string, any>;
		createdAt: string;
		updatedAt: string;
	};

	let campaigns = $state<HarnessCampaign[]>([]);
	let isHydrated = $state(false);
	let editingId = $state<string | null>(null);
	const isEditing = $derived(Boolean(editingId));

	onMount(() => {
		isHydrated = true;
	});

	function cloneCampaigns() {
		return campaigns.map((campaign) => ({
			...campaign,
			content: structuredClone(campaign.content)
		}));
	}

	async function fetchCampaigns() {
		await new Promise((resolve) => setTimeout(resolve, 0));
		return cloneCampaigns();
	}

	async function deleteCampaigns(ids: string[]) {
		await new Promise((resolve) => setTimeout(resolve, 50));
		campaigns = campaigns.filter((campaign) => !ids.includes(campaign.id));
	}

	const listPage = createListPage<HarnessCampaign>({
		fetchItems: fetchCampaigns,
		deleteItems: deleteCampaigns,
		itemName: 'campaign',
		itemNamePlural: 'campaigns'
	});

	let nameInput = $state('');
	let contentInput = $state('{}');
	let formError = $state<string | null>(null);

	function resetForm() {
		nameInput = '';
		contentInput = '{}';
		formError = null;
		editingId = null;
	}

	function createCampaignRecord(name: string, content: Record<string, any>): HarnessCampaign {
		const now = new Date().toISOString();
		return {
			id: crypto.randomUUID(),
			userId: 'harness-user',
			name,
			content,
			createdAt: now,
			updatedAt: now
		};
	}

	function upsertCampaign(event: SubmitEvent) {
		event.preventDefault();
		formError = null;

		const trimmedName = nameInput.trim();
		if (!trimmedName) {
			formError = 'Name is required.';
			return;
		}

		try {
			const parsedContent = contentInput ? JSON.parse(contentInput) : {};
			if (editingId) {
				campaigns = campaigns.map((campaign) =>
					campaign.id === editingId
						? {
							...campaign,
							name: trimmedName,
							content: parsedContent,
							updatedAt: new Date().toISOString()
						}
						: campaign
				);
				toast.success('Campaign updated for automation harness');
			} else {
				campaigns = [...campaigns, createCampaignRecord(trimmedName, parsedContent)];
				toast.success('Campaign created for automation harness');
			}
			listPage.refresh();
			resetForm();
		} catch (error) {
			formError = 'Content must be valid JSON.';
		}
	}

	function startEditing(target: HarnessCampaign) {
		editingId = target.id;
		nameInput = target.name;
		contentInput = JSON.stringify(target.content ?? {}, null, 2);
		formError = null;
	}

	function cancelEditing() {
		resetForm();
	}

	async function handleBulkDelete() {
		await listPage.handleBulkDelete();
	}

	let deletingIds = $state<Set<string>>(new Set());

	async function handleDelete(id: string) {
		if (deletingIds.has(id)) return;
		deletingIds = new Set(deletingIds).add(id);
		try {
			await listPage.handleDelete(id);
		} finally {
			deletingIds = new Set([...deletingIds].filter((value) => value !== id));
			if (editingId === id) {
				resetForm();
			}
		}
	}
</script>

<div class="space-y-6" data-testid="campaign-harness" data-hydrated={isHydrated}>
	<div class="bg-white shadow rounded-lg p-6 space-y-4">
		<h1 class="text-2xl font-bold">Campaign Automation Harness</h1>
		<p class="text-gray-600">
			Use this page to seed deterministic campaign data for automated regression tests. No authentication or
			database access is required—the data lives entirely in memory.
		</p>

		<form class="grid gap-4" onsubmit={upsertCampaign} data-testid="campaign-create-form">
			{#if isEditing}
				<div class="rounded-md border border-yellow-300 bg-yellow-50 px-3 py-2 text-sm text-yellow-800 flex items-center justify-between" data-testid="campaign-edit-banner">
					<span>Editing existing campaign</span>
					<button type="button" class="text-yellow-900 underline" onclick={cancelEditing} data-testid="campaign-cancel-edit">Cancel</button>
				</div>
			{/if}
			<label class="block text-sm font-medium text-gray-700">
				<span>Campaign Name</span>
				<input
					name="name"
					bind:value={nameInput}
					data-testid="campaign-name-input"
					required
					class="mt-1 w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
					placeholder="Test 1"
				/>
			</label>

			<label class="block text-sm font-medium text-gray-700">
				<span>Content (JSON)</span>
				<textarea
					name="content"
					rows="4"
					bind:value={contentInput}
					data-testid="campaign-content-input"
					class="mt-1 w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 font-mono text-sm"
					placeholder={'{}'}
				></textarea>
			</label>

			{#if formError}
				<p class="text-sm text-red-600" data-testid="campaign-form-error">{formError}</p>
			{/if}

			<div class="flex gap-3">
				<button
					type="submit"
					class="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
					data-testid="campaign-submit"
				>
					{isEditing ? 'Save Campaign' : 'Add Campaign'}
				</button>
				<button
					type="button"
					onclick={resetForm}
					class="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300"
					data-testid="campaign-reset"
				>
					Reset Form
				</button>
			</div>
		</form>
	</div>

	<section class="bg-white shadow rounded-lg p-6 space-y-6">
		<Breadcrumb feature="campaigns" />
		<div class="flex justify-between items-center">
			<div>
				<h2 class="text-2xl font-bold">Campaigns (Automation Sandbox)</h2>
				<p class="text-gray-600 mt-1">Seed deterministic campaign data without touching the database.</p>
			</div>
			<BulkActionToolbar
				selectedCount={listPage.selection.count}
				totalCount={campaigns.length}
				onSelectAll={() => listPage.selection.selectAll(campaigns)}
				onDeselectAll={() => listPage.selection.deselectAll()}
				onDelete={handleBulkDelete}
				newItemHref="/testing/campaigns-automation"
				newItemLabel="Manual Create"
				deleteLabel="Delete Selected"
			/>
		</div>

		{#if campaigns.length === 0}
			<EmptyState
				icon={Megaphone}
				title="No Campaigns"
				description="Use the form above to create Test 1 through Test 10."
				actionLabel="Create Campaign"
				actionHref="/testing/campaigns-automation"
			/>
		{:else}
			<div class="grid gap-4">
				{#each campaigns as campaign (campaign.id)}
					<div data-testid="campaign-card" data-campaign-id={campaign.id} data-campaign-name={campaign.name}>
						<ListCard
							id={campaign.id}
							href={`/testing/campaigns-automation/${campaign.id}`}
							selected={listPage.selection.isSelected(campaign.id)}
							onToggle={listPage.selection.toggleSelection}
						>
							{#snippet title()}
								<span class="text-blue-600 font-semibold">{campaign.name}</span>
							{/snippet}

							{#snippet content()}
								<pre class="bg-gray-50 p-3 rounded text-xs overflow-auto">{JSON.stringify(campaign.content, null, 2)}</pre>
							{/snippet}

							{#snippet metadata()}
								<p class="text-xs text-gray-500">
									Created {new Date(campaign.createdAt).toLocaleString()} • Updated {new Date(campaign.updatedAt).toLocaleString()}
								</p>
							{/snippet}

							{#snippet actions()}
								<div class="flex flex-col gap-2">
									<button
										type="button"
										data-testid="campaign-edit-button"
										data-campaign-id={campaign.id}
										onclick={(event) => {
											event.stopPropagation();
											startEditing(campaign);
										}}
										class="px-4 py-2 bg-amber-500 text-white rounded hover:bg-amber-600"
									>
										Edit
									</button>
									<button
										type="button"
										data-testid="campaign-delete-button"
										data-campaign-id={campaign.id}
										onclick={(event) => {
											event.stopPropagation();
											void handleDelete(campaign.id);
										}}
										disabled={deletingIds.has(campaign.id)}
										class="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
									>
										{deletingIds.has(campaign.id) ? 'Deleting...' : 'Delete'}
									</button>
								</div>
							{/snippet}
						</ListCard>
					</div>
				{/each}
			</div>
		{/if}
	</section>
</div>
