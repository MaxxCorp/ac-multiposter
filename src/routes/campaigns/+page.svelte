<script lang="ts">
	import { page } from '$app/stores';
	import { browser } from '$app/environment';
	import { replaceState } from '$app/navigation';
	import { listCampaigns } from './list.remote';
	import { deleteCampaigns } from './[id]/delete.remote';
	import type { Campaign } from './list.remote';
	import { createListPage } from '$lib/hooks/useListPage.svelte';
	import ListPageLayout from '$lib/components/ui/ListPageLayout.svelte';
	import ListCard from '$lib/components/ui/ListCard.svelte';
	import { Megaphone } from '@lucide/svelte';

	let itemsPromise = $state<Promise<Campaign[]>>(listCampaigns());

	function refreshItems() {
		itemsPromise = listCampaigns();
	}

	// Use the shared list page logic
	const listPage = createListPage<Campaign>({
		fetchItems: listCampaigns,
		deleteItems: (ids) => deleteCampaigns(ids).updates(listCampaigns()),
		itemName: 'campaign',
		itemNamePlural: 'campaigns',
	});

	async function handleBulkDelete() {
		await listPage.handleBulkDelete();
		refreshItems();
	}

	async function handleDelete(id: string) {
		await listPage.handleDelete(id);
		refreshItems();
	}

	const focusedId = $derived($page.url.searchParams.get('focus'));
	let highlightedId = $state<string | null>(null);

	$effect(() => {
		if (!browser) return;
		const focus = focusedId;
		if (!focus) return;
		highlightedId = focus;
		const currentUrl = new URL(window.location.href);
		currentUrl.searchParams.delete('focus');
		replaceState(`${currentUrl.pathname}${currentUrl.search}${currentUrl.hash}`, {
			keepFocus: true,
			noScroll: true,
		});
	});

	$effect(() => {
		if (!browser) return;
		if (!highlightedId) return;
		const timeout = setTimeout(() => {
			highlightedId = null;
		}, 4000);
		return () => clearTimeout(timeout);
	});
</script>

	<ListPageLayout
		feature="campaigns"
		title="Campaigns"
		itemsPromise={itemsPromise}
		selection={listPage.selection}
		selectionVersion={listPage.selection.version}
		onBulkDelete={handleBulkDelete}
		newItemHref="/campaigns/new"
		newItemLabel="+ New Campaign"
		emptyIcon={Megaphone}
		emptyTitle="No Campaigns"
		emptyDescription="Get started by creating your first marketing campaign"
		emptyActionLabel="Create Your First Campaign"
		loadingMessage="Loading campaigns..."
	>
		{#snippet children(campaign)}
			<ListCard
				id={campaign.id}
				href={`/campaigns/${campaign.id}`}
				selected={listPage.selection.isSelected(campaign.id)}
				onToggle={listPage.selection.toggleSelection}
				editHref={`/campaigns/${campaign.id}?edit=1`}
				onDelete={handleDelete}
				deleteLabel="Delete"
				highlight={campaign.id === highlightedId}
				cardNavigationEnabled={false}
			>
				{#snippet title()}
					<a 
						href={`/campaigns/${campaign.id}`} 
						class="hover:underline text-blue-600"
						onclick={(e) => e.stopPropagation()}
					>
						{campaign.name}
					</a>
				{/snippet}

				{#snippet content()}
					<pre class="bg-gray-50 p-4 rounded text-sm overflow-auto">{JSON.stringify(
							campaign.content,
							null,
							2
						)}</pre>
				{/snippet}

				{#snippet metadata()}
					<p class="text-xs text-gray-500 mt-3">
						Created: {new Date(campaign.createdAt).toLocaleString()}
					</p>
				{/snippet}
			</ListCard>
		{/snippet}
	</ListPageLayout>
