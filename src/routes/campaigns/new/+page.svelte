<script lang="ts">
	import { goto } from '$app/navigation';
	import { createCampaign } from './create.remote';
	import Breadcrumb from '$lib/components/ui/Breadcrumb.svelte';
	import CampaignForm from '$lib/components/campaigns/CampaignForm.svelte';
	import { toast } from '$lib/stores/toast.svelte';

	const createForm = createCampaign;
	const handleEnhance: Parameters<typeof createForm.enhance>[0] = async ({ submit }) => {
		try {
			await submit();
			const result = createForm.result;
			if (result?.success) {
				toast.success('Campaign created successfully!');
				const campaignId = result.campaign?.id;
				const target = campaignId ? `/campaigns?focus=${encodeURIComponent(campaignId)}` : '/campaigns';
				await goto(target);
				return;
			}

			if (result?.error) {
				toast.error(`Failed to create campaign: ${result.error}`);
			} else {
				toast.error('Failed to create campaign. Please try again.');
			}
		} catch (error) {
			toast.error('An unexpected error occurred while creating the campaign.');
			throw error;
		}
	};
</script>

<div class="container mx-auto px-4 py-8">
	<Breadcrumb 
		feature="campaigns"
		current="New Campaign"
	/>

	<div class="max-w-2xl">
		<h1 class="text-3xl font-bold mb-6">Create New Campaign</h1>

		<CampaignForm form={createForm} enhance={handleEnhance} mode="create" cancelHref="/campaigns" />
	</div>
</div>
