<script lang="ts">
	import CampaignForm from "$lib/components/campaigns/CampaignForm.svelte";
	import { createCampaign } from "./create.remote";
	import { createCampaignSchema } from "$lib/validations/campaigns";
</script>

<CampaignForm
	remoteFunction={createCampaign}
	validationSchema={createCampaignSchema}
/>
