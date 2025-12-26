<script lang="ts">
    import {
        checkStatus,
        register,
        unregister,
    } from "../../../routes/synchronizations/[id]/webhook.remote";
    import AsyncButton from "$lib/components/ui/AsyncButton.svelte";
    import { toast } from "svelte-sonner";
    import { Bell, BellOff } from "@lucide/svelte";

    let { configId, providerType, direction } = $props<{
        configId: string;
        providerType: string;
        direction: string;
    }>();

    let version = $state(0);
    let actionLoading = $state(false);

    // Only show for active configurations that support it
    // Note: This derived check is simple logic.
    const supportsWebhooks = $derived(
        (providerType === "google-calendar" &&
            (direction === "pull" || direction === "bidirectional")) ||
        (providerType === "email" && direction === "push"),
    );

    let statusPromise = $derived.by(() => {
        // Track version to support manual refresh
        version;
        if (supportsWebhooks) {
            return checkStatus(configId);
        }
        return Promise.resolve(null);
    });

    async function toggleWebhook(currentStatus: { active: boolean } | null) {
        try {
            actionLoading = true;
            if (currentStatus?.active) {
                await unregister(configId);
                toast.success("Webhook unregistered successfully");
            } else {
                await register(configId);
                toast.success("Webhook registered successfully");
            }
            version++; // Trigger re-fetch
        } catch (error: any) {
            const action = currentStatus?.active ? "unregister" : "register";
            toast.error(`Failed to ${action} webhook: ${error.message}`);
        } finally {
            actionLoading = false;
        }
    }
</script>

{#if supportsWebhooks}
    {#await statusPromise}
        <AsyncButton
            variant="default"
            size="sm"
            loading={true}
            loadingLabel="Loading..."
            disabled
            class="w-full flex items-center justify-center gap-2"
        >
            <span>Loading...</span>
        </AsyncButton>
    {:then status}
        <AsyncButton
            variant={status?.active ? "outline" : "default"}
            size="sm"
            loading={actionLoading}
            loadingLabel="Updating..."
            onclick={() => toggleWebhook(status)}
            class="w-full flex items-center justify-center gap-2"
            title={status?.active
                ? "Webhook Active - Click to unregister"
                : "Webhook Inactive - Click to register"}
        >
            {#if status?.active}
                <Bell class="h-4 w-4 text-green-600" />
                <span class="text-green-600">Active</span>
            {:else}
                <BellOff class="h-4 w-4" />
                <span>Activate</span>
            {/if}
        </AsyncButton>
    {:catch error}
        <div class="text-xs text-red-500">Failed to load status</div>
    {/await}
{/if}
