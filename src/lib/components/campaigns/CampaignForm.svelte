<script lang="ts">
    import { goto } from "$app/navigation";
    import type { Campaign } from "$lib/server/db/schema/campaigns";
    import { deleteCampaigns } from "../../../routes/campaigns/[id]/delete.remote";
    import Breadcrumb from "$lib/components/ui/Breadcrumb.svelte";
    import AsyncButton from "$lib/components/ui/AsyncButton.svelte";
    import { toast } from "svelte-sonner";
    import { Button } from "$lib/components/ui/button";
    import { handleDelete } from "$lib/hooks/handleDelete.svelte";
    import type { updateCampaign } from "../../../routes/campaigns/[id]/update.remote";
    import type { createCampaign } from "../../../routes/campaigns/new/create.remote";

    // Accept either create or update remote function as a prop
    let {
        remoteFunction,
        validationSchema,
        isUpdating = false,
        initialData = null,
    }: {
        remoteFunction: typeof updateCampaign | typeof createCampaign;
        validationSchema: any;
        isUpdating?: boolean;
        initialData?: Campaign | null;
    } = $props();

    function getField(name: string) {
        if (!(remoteFunction as any).fields) return {};
        return (remoteFunction as any).fields[name] || {};
    }
</script>

<div class="max-w-2xl mx-auto">
    <Breadcrumb
        feature="campaigns"
        current={initialData?.name ?? "New Campaign"}
    />
    <div class="bg-white shadow rounded-lg p-6 space-y-4">
        <div class="flex justify-between items-start mb-6">
            <div>
                <h1 class="text-3xl font-bold mb-2">
                    {initialData?.name ?? "New Campaign"}
                </h1>
                {#if initialData}
                    <p class="text-sm text-gray-500">
                        Created: {new Date(
                            initialData.createdAt,
                        ).toLocaleString()}
                        {#if initialData.updatedAt !== initialData.createdAt}
                            • Updated: {new Date(
                                initialData.updatedAt,
                            ).toLocaleString()}
                        {/if}
                    </p>
                {/if}
            </div>
            {#if initialData}
                <div class="flex gap-2">
                    <AsyncButton
                        type="button"
                        loadingLabel="Deleting..."
                        loading={deleteCampaigns.pending}
                        variant="destructive"
                        onclick={async () => {
                            await handleDelete({
                                ids: [initialData.id],
                                deleteFn: deleteCampaigns,
                                itemName: "campaign",
                            });
                            goto("/campaigns");
                        }}
                    >
                        Delete
                    </AsyncButton>
                </div>
            {/if}
        </div>

        <h2 class="text-xl font-semibold mb-4">
            {isUpdating ? "Edit Campaign" : "Create Campaign"}
        </h2>

        <form
            {...remoteFunction
                .preflight(validationSchema)
                .enhance(async ({ submit }) => {
                    try {
                        const result: any = await submit();
                        if (result?.error) {
                            toast.error(
                                result.error.message ||
                                    "Oh no! Something went wrong",
                            );
                            return;
                        }
                        toast.success("Successfully saved!");
                        goto("/campaigns");
                    } catch (error: unknown) {
                        const err = error as { message?: string };
                        toast.error(
                            err?.message || "Oh no! Something went wrong",
                        );
                    }
                })}
            class="space-y-4"
        >
            {#if isUpdating && initialData}
                <input {...getField("id").as("hidden", initialData.id)} />
            {/if}

            <label class="block">
                <span class="text-sm font-medium text-gray-700 mb-2"
                    >Campaign Name</span
                >
                <input
                    {...getField("name").as("text")}
                    class="mt-2 w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 {(getField(
                        'name',
                    ).issues()?.length ?? 0) > 0
                        ? 'border-red-500'
                        : 'border-gray-300'}"
                    placeholder="Enter campaign name"
                    value={isUpdating ? initialData?.name : ""}
                    onblur={() => remoteFunction.validate()}
                />
                {#each getField("name").issues() ?? [] as issue}
                    <p class="mt-1 text-sm text-red-600">
                        {issue.message}
                    </p>
                {/each}
            </label>

            <label class="block">
                <span class="text-sm font-medium text-gray-700 mb-2"
                    >Content (JSON)</span
                >
                <textarea
                    {...getField("content").as("text")}
                    rows="12"
                    class="mt-2 w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm {(getField(
                        'content',
                    ).issues()?.length ?? 0) > 0
                        ? 'border-red-500'
                        : 'border-gray-300'}"
                    placeholder={"{}"}
                    value={isUpdating
                        ? JSON.stringify(initialData?.content)
                        : "{}"}
                    onblur={() => remoteFunction.validate()}
                ></textarea>
                {#each getField("content").issues() ?? [] as issue}
                    <p class="mt-1 text-sm text-red-600">
                        {issue.message}
                    </p>
                {/each}
                <p class="mt-1 text-sm text-gray-500">
                    Enter campaign content as JSON
                </p>
            </label>

            <div class="flex gap-3 mt-6">
                <AsyncButton
                    type="submit"
                    loadingLabel="Saving..."
                    loading={remoteFunction.pending}
                >
                    {isUpdating ? "Save Changes" : "Create Campaign"}
                </AsyncButton>
                <Button variant="secondary" href="/campaigns" size="default">
                    Cancel
                </Button>
            </div>
        </form>
    </div>
</div>
