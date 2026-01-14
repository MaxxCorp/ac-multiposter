<script lang="ts">
	import { page } from "$app/state";
	import { readCampaign } from "./read.remote";
	import { updateCampaign } from "./update.remote";
	import { updateCampaignSchema } from "$lib/validations/campaigns";
	import CampaignForm from "$lib/components/campaigns/CampaignForm.svelte";
	import LoadingSection from "$lib/components/ui/LoadingSection.svelte";
	import ErrorSection from "$lib/components/ui/ErrorSection.svelte";
</script>

{#await readCampaign(page.params.id ?? "")}
	<LoadingSection message="Loading campaign..." />
{:then campaign}
	{#if campaign}
		<CampaignForm
			remoteFunction={updateCampaign}
			validationSchema={updateCampaignSchema}
			isUpdating={true}
			initialData={campaign}
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
