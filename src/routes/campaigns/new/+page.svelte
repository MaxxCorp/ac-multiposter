<script lang="ts">
	import CampaignForm from "$lib/components/campaigns/campaignForm.svelte";
	import { createCampaign } from "./create.remote";
	import { createCampaignSchema } from "$lib/validations/campaign.ts";
</script>

<CampaignForm
	remoteFunc={createCampaign}
	validationSchema={createCampaignSchema}
/>
