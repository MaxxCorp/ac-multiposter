<script lang="ts">
	import { list } from './list.remote';
	import { remove, removeBulk } from './[id]/delete.remote';
	import Breadcrumb from '$lib/components/ui/Breadcrumb.svelte';
	import ListCard from '$lib/components/ui/ListCard.svelte';
	import BulkActionToolbar from '$lib/components/ui/BulkActionToolbar.svelte';
	import EmptyState from '$lib/components/ui/EmptyState.svelte';
	import Spinner from '$lib/components/ui/Spinner.svelte';
	import { createMultiSelect } from '$lib/hooks/multiSelect.svelte';
	import { toast } from '$lib/stores/toast.svelte';
	import { Calendar, Plus, RefreshCw, AlertCircle, CheckCircle2 } from '@lucide/svelte';

	// Multi-select state
	const selection = createMultiSelect<any>();
	
	// Create a single promise for the config list
	let configsPromise = $state(list());

	async function handleBulkDelete() {
		if (selection.count === 0) return;
		if (!confirm(`Delete ${selection.count} sync configuration(s)?`)) return;

		try {
			await removeBulk(selection.getSelectedArray()).updates(list());
			toast.success(`${selection.count} sync configuration(s) deleted successfully!`);
			selection.deselectAll();
			configsPromise = list(); // Refresh the list
		} catch (error: any) {
			toast.error(error.message || 'Failed to delete sync configurations');
		}
	}

	function formatDate(date: Date | null) {
		if (!date) return 'Never';
		return new Date(date).toLocaleString();
	}

	function getProviderIcon(providerType: string) {
		if (providerType === 'google-calendar') return Calendar;
		return Calendar;
	}

	function getProviderLabel(providerType: string) {
		if (providerType === 'google-calendar') return 'Google Calendar';
		if (providerType === 'microsoft-calendar') return 'Microsoft Calendar';
		return providerType;
	}

	function getDirectionLabel(direction: string) {
		if (direction === 'pull') return 'Pull Only';
		if (direction === 'push') return 'Push Only';
		if (direction === 'bidirectional') return 'Bidirectional';
		return direction;
	}

	function getStatusColor(enabled: boolean, lastSyncAt: Date | null) {
		if (!enabled) return 'text-gray-400';
		if (!lastSyncAt) return 'text-yellow-500';
		const hoursSinceSync = (Date.now() - new Date(lastSyncAt).getTime()) / (1000 * 60 * 60);
		if (hoursSinceSync > 24) return 'text-orange-500';
		return 'text-green-500';
	}
</script>

<svelte:head>
	<title>Synchronizations</title>
</svelte:head>

<div class="container mx-auto px-4 py-8">
	<Breadcrumb feature="synchronizations" />
	
	{#await configsPromise}
		<div class="mb-8 flex items-center justify-between">
			<div>
				<h1 class="text-3xl font-bold">Synchronizations</h1>
				<p class="text-gray-600 mt-2">Manage your calendar synchronization connections</p>
			</div>
		</div>
		<Spinner message="Loading synchronizations..." />
	{:then configs}
		<div class="mb-8 flex items-center justify-between">
			<div>
				<h1 class="text-3xl font-bold">Synchronizations</h1>
				<p class="text-gray-600 mt-2">Manage your calendar synchronization connections</p>
			</div>
			<BulkActionToolbar
				selectedCount={selection.count}
				totalCount={configs.length}
				onSelectAll={() => selection.selectAll(configs)}
				onDeselectAll={() => selection.deselectAll()}
				onDelete={handleBulkDelete}
				newItemHref="/synchronizations/new"
				newItemLabel="Add Sync"
			/>
		</div>

		{#if configs.length === 0}
			<EmptyState
				icon={Calendar}
				title="No Synchronizations"
				description="Get started by connecting your first calendar service"
				actionLabel="Add Your First Sync"
				actionHref="/synchronizations/new"
			/>
		{:else}
			<div class="grid gap-4">
				{#each configs as config}
					{@const Icon = getProviderIcon(config.providerType)}
					{@const statusColor = getStatusColor(config.enabled, config.lastSyncAt)}
					<ListCard
						id={config.id}
						href={`/synchronizations/${config.id}`}
						selected={selection.isSelected(config.id)}
						onToggle={selection.toggleSelection}
						editHref={`/synchronizations/${config.id}`}
						onDelete={async (id) => {
							await remove(id).updates(list());
							toast.success('Sync configuration deleted successfully!');
							configsPromise = list(); // Refresh the list
						}}
						deleteLabel="Delete"
						cardNavigationEnabled={false}
					>
					{#snippet title()}
						<a 
							href={`/synchronizations/${config.id}`} 
							class="flex items-center gap-3 hover:opacity-80"
							onclick={(e) => e.stopPropagation()}
						>
							<div class="rounded-lg bg-blue-100 p-2">
								<Icon class="h-6 w-6 text-blue-600" />
							</div>
							<div>
								<h3 class="font-semibold text-lg text-blue-600">
									{getProviderLabel(config.providerType)}
								</h3>
								<p class="text-sm text-gray-500">{config.providerId}</p>
							</div>
						</a>
					{/snippet}

					{#snippet badge()}
						<div class={statusColor}>
							{#if config.enabled}
								<CheckCircle2 class="h-5 w-5" />
							{:else}
								<AlertCircle class="h-5 w-5" />
							{/if}
						</div>
					{/snippet}

					{#snippet content()}
						<div class="space-y-2 text-sm">
							<div class="flex justify-between">
								<span class="text-gray-600">Direction:</span>
								<span class="font-medium">{getDirectionLabel(config.direction)}</span>
							</div>
							<div class="flex justify-between">
								<span class="text-gray-600">Status:</span>
								<span class={`font-medium ${config.enabled ? 'text-green-600' : 'text-gray-400'}`}>
									{config.enabled ? 'Enabled' : 'Disabled'}
								</span>
							</div>
							<div class="flex justify-between">
								<span class="text-gray-600">Last Sync:</span>
								<span class="font-medium">{formatDate(config.lastSyncAt)}</span>
							</div>
							{#if config.webhookId}
								<div class="flex justify-between">
									<span class="text-gray-600">Webhooks:</span>
									<span class="font-medium text-green-600">Active</span>
								</div>
							{/if}
						</div>
					{/snippet}

					{#snippet metadata()}
						<p class="text-xs text-gray-500">
							Created {formatDate(config.createdAt)}
						</p>
					{/snippet}
				</ListCard>
			{/each}
		</div>
		{/if}
	{:catch error}
		<div class="text-center py-12">
			<div class="rounded-lg border border-red-200 bg-red-50 p-4 inline-block">
				<div class="flex items-center gap-2 text-red-600 mb-3">
					<AlertCircle class="h-5 w-5" />
					<p>{error?.message || 'Failed to load sync configurations'}</p>
				</div>
				<button 
					onclick={() => configsPromise = list()}
					class="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
				>
					Retry
				</button>
			</div>
		</div>
	{/await}
</div>
