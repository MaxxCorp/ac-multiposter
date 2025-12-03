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

    let status = $state<{ active: boolean; expiresAt?: Date } | null>(null);
    let loading = $state(true);

    // Only show for providers that support webhooks and directions that need it
    const supportsWebhooks = $derived.by(() =>
        providerType === "google-calendar" &&
        (direction === "pull" || direction === "bidirectional")
    );

    $effect(() => {
        if (supportsWebhooks) {
            loadStatus();
        } else {
            loading = false;
        }
    });

    async function loadStatus() {
        try {
            loading = true;
            status = await checkStatus(configId);
        } catch (error) {
            console.error("Failed to load webhook status:", error);
        } finally {
            loading = false;
        }
    }

    async function toggleWebhook() {
        try {
            if (status?.active) {
                await unregister(configId);
                toast.success("Webhook unregistered successfully");
            } else {
                await register(configId);
                toast.success("Webhook registered successfully");
            }
            await loadStatus();
        } catch (error: any) {
            toast.error(
                `Failed to ${status?.active ? "unregister" : "register"} webhook: ${error.message}`,
            );
        }
    }
</script>

{#if supportsWebhooks}
    <AsyncButton
        variant={status?.active ? "outline" : "default"}
        size="sm"
        {loading}
        loadingLabel="Updating..."
        onclick={toggleWebhook}
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
{/if}
