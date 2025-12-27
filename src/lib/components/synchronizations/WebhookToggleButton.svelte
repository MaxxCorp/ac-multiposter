<script lang="ts">
    import {
        checkStatus,
        register,
        unregister,
    } from "../../../routes/synchronizations/[id]/webhook.remote";
    import AsyncButton from "$lib/components/ui/AsyncButton.svelte";
    import { toast } from "svelte-sonner";
    import { Bell, BellOff } from "@lucide/svelte";
    import { invalidateAll } from "$app/navigation";

    let { configId, providerType, direction } = $props<{
        configId: string;
        providerType: string;
        direction: string;
    }>();

    let status = $state<{ active: boolean; expiresAt?: Date } | null>(null);
    let isLoadingStatus = $state(true);
    let actionLoading = $state(false);

    // Only show for active configurations that support it
    const supportsWebhooks = $derived(
        (providerType === "google-calendar" &&
            (direction === "pull" || direction === "bidirectional")) ||
            (providerType === "email" && direction === "push"),
    );

    async function refreshStatus() {
        if (!supportsWebhooks) return;
        isLoadingStatus = true;
        try {
            status = await checkStatus(configId);
        } catch (error) {
            console.error("Failed to load webhook status:", error);
        } finally {
            isLoadingStatus = false;
        }
    }

    $effect(() => {
        refreshStatus();
    });

    async function toggleWebhook() {
        if (!status) return;
        const previousStatus = { ...status };

        try {
            actionLoading = true;
            // Optimistic update
            status = { ...status, active: !status.active };

            if (previousStatus.active) {
                const newStatus = await unregister(configId);
                status = newStatus;
                toast.success("Webhook unregistered successfully");
            } else {
                const newStatus = await register(configId);
                status = newStatus;
                toast.success("Webhook registered successfully");
            }

            // Refresh parent page data if on a synchronization page
            await invalidateAll();
        } catch (error: any) {
            // Revert on error
            status = previousStatus;
            const action = previousStatus.active ? "unregister" : "register";
            toast.error(`Failed to ${action} webhook: ${error.message}`);
        } finally {
            actionLoading = false;
        }
    }
</script>

{#if supportsWebhooks}
    {#if isLoadingStatus && !status}
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
    {:else}
        <AsyncButton
            variant={status?.active ? "outline" : "default"}
            size="sm"
            loading={actionLoading}
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
{/if}
