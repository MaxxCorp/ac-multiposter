<script lang="ts">
	import { page } from "$app/state";
	import { readCampaign } from "./read.remote";
	import { updateCampaign } from "./update.remote";
	import { updateCampaignSchema } from "$lib/validations/campaign.ts";
	import CampaignForm from "$lib/components/campaigns/campaignForm.svelte";
	import LoadingSection from "$lib/components/ui/LoadingSection.svelte";
	import ErrorSection from "$lib/components/ui/ErrorSection.svelte";
</script>

{#await readCampaign(page.params.id ?? "")}
	<LoadingSection message="Loading campaign..." />
{:then campaign}
	{#if campaign}
		<CampaignForm
			remoteFunc={updateCampaign}
			validationSchema={updateCampaignSchema}
			isUpdating={true}
			{campaign}
		/>
	{:else}
		<ErrorSection
			headline="Campaign Not Found"
			message="Campaign Not Found"
		/>
	{/if}
{:catch error}
	<ErrorSection headline="An error occurred" message={error.message} />
{/await}
