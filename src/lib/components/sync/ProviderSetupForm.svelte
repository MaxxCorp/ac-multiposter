<script lang="ts">
	import { Calendar, ArrowLeft, ArrowRight, ArrowLeftRight } from '@lucide/svelte';
	import DashboardCard from '$lib/components/ui/DashboardCard.svelte';

	export let selectedProvider: 'google-calendar' | 'microsoft-calendar' | null = null;
	export let providerId: string = '';
	export let direction: 'pull' | 'push' | 'bidirectional' = 'bidirectional';
	export let calendarId: string = 'primary';
	export let syncIntervalMinutes: number = 60;
	export let onSubmit: () => void;
	export let submitting: boolean = false;

	const providers = [
		{
			id: 'google-calendar' as const,
			name: 'Google Calendar',
			description: 'Sync with your Google Calendar',
			icon: Calendar,
			available: true
		},
		{
			id: 'microsoft-calendar' as const,
			name: 'Microsoft Calendar',
			description: 'Sync with Outlook/Microsoft 365',
			icon: Calendar,
			available: false
		}
	];

	const directions = [
		{
			value: 'pull' as const,
			label: 'Pull Only',
			description: 'Import events from external calendar',
			icon: ArrowLeft
		},
		{
			value: 'push' as const,
			label: 'Push Only',
			description: 'Export events to external calendar',
			icon: ArrowRight
		},
		{
			value: 'bidirectional' as const,
			label: 'Bidirectional',
			description: 'Keep both calendars in sync',
			icon: ArrowLeftRight
		}
	];
</script>

<form onsubmit={(e) => { e.preventDefault(); onSubmit(); }} class="space-y-6">
	<!-- Provider Selection -->
	<DashboardCard>
		<h2 class="text-xl font-semibold mb-4">Select Calendar Provider</h2>
		<div class="grid gap-4 md:grid-cols-2">
			{#each providers as provider}
				{@const Icon = provider.icon}
				<button
					type="button"
					disabled={!provider.available}
					class="text-left p-4 rounded-lg border-2 transition-all {selectedProvider ===
					provider.id
						? 'border-blue-600 bg-blue-50'
						: provider.available
						? 'border-gray-200 hover:border-gray-300'
						: 'border-gray-100 bg-gray-50 opacity-50 cursor-not-allowed'}"
					onclick={() => provider.available && (selectedProvider = provider.id)}
				>
					<div class="flex items-start gap-3">
						<div
							class="rounded-lg p-2 {selectedProvider === provider.id
								? 'bg-blue-200'
								: 'bg-gray-100'}"
						>
							<Icon
								class="h-6 w-6 {selectedProvider === provider.id
									? 'text-blue-600'
									: 'text-gray-600'}"
							/>
						</div>
						<div class="flex-1">
							<h3 class="font-semibold">{provider.name}</h3>
							<p class="text-sm text-gray-600">{provider.description}</p>
							{#if !provider.available}
								<p class="text-xs text-orange-600 mt-1">Coming soon</p>
							{/if}
						</div>
					</div>
				</button>
			{/each}
		</div>
	</DashboardCard>

	{#if selectedProvider}
		<!-- Configuration -->
		<DashboardCard>
			<h2 class="text-xl font-semibold mb-4">Configuration</h2>
			<div class="space-y-4">
				<div>
					<label for="providerId" class="block text-sm font-medium text-gray-700 mb-1">
						Sync Name
					</label>
					<input
						type="text"
						id="providerId"
						bind:value={providerId}
						placeholder="e.g., my-work-calendar"
						class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
					/>
					<p class="text-xs text-gray-500 mt-1">A unique identifier for this sync configuration</p>
				</div>

				{#if selectedProvider === 'google-calendar'}
					<div>
						<label for="calendarId" class="block text-sm font-medium text-gray-700 mb-1">
							Calendar ID
						</label>
						<input
							type="text"
							id="calendarId"
							bind:value={calendarId}
							placeholder="primary"
							class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
						/>
						<p class="text-xs text-gray-500 mt-1">
							Use "primary" for your main calendar or specify a calendar ID
						</p>
					</div>
				{/if}

				<div>
					<label for="syncInterval" class="block text-sm font-medium text-gray-700 mb-1">
						Sync Interval (minutes)
					</label>
					<input
						type="number"
						id="syncInterval"
						bind:value={syncIntervalMinutes}
						min="15"
						max="1440"
						class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
					/>
					<p class="text-xs text-gray-500 mt-1">How often to sync (15 minutes to 24 hours)</p>
				</div>
			</div>
		</DashboardCard>

		<!-- Sync Direction -->
		<DashboardCard>
			<h2 class="text-xl font-semibold mb-4">Sync Direction</h2>
			<div class="space-y-3">
				{#each directions as dir}
					{@const Icon = dir.icon}
					<label
						class="flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors {direction ===
						dir.value
							? 'border-blue-600 bg-blue-50'
							: 'border-gray-200 hover:border-gray-300'}"
					>
						<input type="radio" name="direction" value={dir.value} bind:group={direction} class="mt-1" />
						<Icon
							class="h-5 w-5 mt-0.5 {direction === dir.value ? 'text-blue-600' : 'text-gray-600'}"
						/>
						<div class="flex-1">
							<div class="font-medium">{dir.label}</div>
							<div class="text-sm text-gray-600">{dir.description}</div>
						</div>
					</label>
				{/each}
			</div>
		</DashboardCard>

		<!-- Submit -->
		<div class="flex items-center justify-end gap-4">
			<slot name="cancel" />
			<button
				type="submit"
				disabled={submitting}
				class="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
			>
				{#if submitting}
					Creating...
				{:else}
					Create Sync
				{/if}
			</button>
		</div>
	{/if}
</form>
