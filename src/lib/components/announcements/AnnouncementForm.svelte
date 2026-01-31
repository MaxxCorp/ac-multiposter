<script lang="ts">
    import { goto } from "$app/navigation";
    import Breadcrumb from "$lib/components/ui/Breadcrumb.svelte";
    import AsyncButton from "$lib/components/ui/AsyncButton.svelte";
    import Button from "$lib/components/ui/button/button.svelte";
    import { toast } from "svelte-sonner";
    import { deleteAnnouncements as deleteAnnouncementAction } from "../../../routes/announcements/[id]/delete.remote";
    import { handleDelete } from "$lib/hooks/handleDelete.svelte";
    import ContactManager from "$lib/components/contacts/ContactManager.svelte";
    import TagInput from "$lib/components/ui/TagInput.svelte";
    import LocationSelector from "$lib/components/locations/LocationSelector.svelte";
    import { listLocations } from "../../../routes/locations/list.remote";
    import type { Location } from "../../../routes/locations/list.remote";
    import { onMount } from "svelte";

    import RichTextEditor from "$lib/components/cms/RichTextEditor.svelte";

    let {
        remoteFunction,
        validationSchema,
        isUpdating = false,
        initialData = null,
    }: {
        remoteFunction: any;
        validationSchema: any;
        isUpdating?: boolean;
        initialData?: any;
    } = $props();

    let contentValue = $state(
        getField("content").value() ?? initialData?.content ?? "",
    );

    // Initialize tags string from tagNames (edit mode) or default to "News" (create mode)
    let tagsString = $state(
        isUpdating && initialData?.tagNames
            ? initialData.tagNames.join(", ")
            : "News",
    );

    let selectedContactIds = $state<string[]>(initialData?.contactIds || []);
    let isPublic = $state(initialData?.isPublic ?? false);

    let locations = $state<Location[]>([]);
    let selectedLocationIds = $state<string[]>(initialData?.locationIds || []);

    onMount(async () => {
        try {
            locations = await listLocations();
        } catch (e) {
            console.error("Failed to load locations", e);
        }
    });

    // Derived JSON for submission
    let tagNamesJson = $derived(
        JSON.stringify(
            tagsString
                .split(",")
                .map((t: string) => t.trim())
                .filter(Boolean),
        ),
    );

    function getField(name: string) {
        if (!(remoteFunction as any).fields) return {};
        const parts = name.split(".");
        let current = (remoteFunction as any).fields;
        for (const part of parts) {
            if (!current) return {};
            current = current[part];
        }
        return current || {};
    }
</script>

<div class="max-w-3xl mx-auto px-4 py-8">
    <Breadcrumb
        feature="announcements"
        current={initialData?.title ?? "New Announcement"}
    />

    <div class="flex justify-between items-center mb-6">
        <h1 class="text-3xl font-bold">
            {isUpdating ? "Edit Announcement" : "New Announcement"}
        </h1>
        {#if isUpdating && initialData}
            <AsyncButton
                type="button"
                variant="destructive"
                loading={deleteAnnouncementAction.pending}
                onclick={async () => {
                    await handleDelete({
                        ids: [initialData.id],
                        deleteFn: deleteAnnouncementAction,
                        itemName: "announcement",
                    });
                    goto("/announcements");
                }}
            >
                Delete
            </AsyncButton>
        {/if}
    </div>

    <form
        {...remoteFunction
            .preflight(validationSchema)
            .enhance(async ({ submit }: any) => {
                try {
                    const result: any = await submit();
                    if (result?.error) {
                        toast.error(
                            result.error.message ||
                                "Oh no! Something went wrong",
                        );
                        return;
                    }
                    toast.success("Successfully Saved!");
                    goto("/announcements");
                } catch (error: any) {
                    toast.error(
                        error?.message || "Oh no! Something went wrong",
                    );
                }
            })}
        class="space-y-6"
    >
        {#if isUpdating && initialData}
            <input {...getField("id").as("hidden", initialData.id)} />
        {/if}

        <input {...getField("isPublic").as("hidden", isPublic.toString())} />
        <!-- Send tagNames as JSON string -->
        <input name="tagNames" value={tagNamesJson} type="hidden" />
        <!-- We no longer strictly need tagIds for submission if using names -->

        <input
            {...getField("contactIds").as(
                "hidden",
                JSON.stringify(selectedContactIds),
            )}
        />

        <div class="bg-white shadow rounded-lg p-6 space-y-4">
            <h2 class="text-xl font-semibold mb-4 border-b pb-2">
                Basic Information
            </h2>

            <div>
                <label
                    for="title"
                    class="block text-sm font-medium text-gray-700 mb-1"
                >
                    Title <span class="text-red-500">*</span>
                </label>
                <input
                    {...getField("title").as("text")}
                    required
                    value={getField("title").value() ??
                        initialData?.title ??
                        ""}
                    class="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 border-gray-300"
                    placeholder="Announcement Title"
                />
                {#each getField("title").issues() ?? [] as issue}
                    <p class="mt-1 text-sm text-red-600">{issue.message}</p>
                {/each}
            </div>

            <div>
                <label
                    for="content"
                    class="block text-sm font-medium text-gray-700 mb-1"
                >
                    Content <span class="text-red-500">*</span>
                </label>
                <div class="prose max-w-none">
                    <RichTextEditor bind:value={contentValue} />
                    <input
                        {...getField("content").as("hidden", contentValue)}
                    />
                </div>
                {#each getField("content").issues() ?? [] as issue}
                    <p class="mt-1 text-sm text-red-600">{issue.message}</p>
                {/each}
            </div>

            <div>
                <TagInput bind:value={tagsString} />
            </div>

            <div>
                <LocationSelector
                    {locations}
                    bind:selectedIds={selectedLocationIds}
                    label="Locations (Optional)"
                />
                <input
                    {...getField("locationIds").as(
                        "hidden",
                        JSON.stringify(selectedLocationIds),
                    )}
                />
            </div>

            <div class="flex items-center gap-2 mt-4">
                <input
                    type="checkbox"
                    bind:checked={isPublic}
                    class="w-4 h-4 text-blue-600"
                />
                <label class="text-sm text-gray-700"
                    >Make this announcement public</label
                >
            </div>
        </div>

        <div class="bg-white shadow rounded-lg p-6 space-y-4">
            <h2 class="text-xl font-semibold mb-4 border-b pb-2">Contacts</h2>
            <ContactManager
                type="announcement"
                entityId={initialData?.id}
                onchange={(ids: string[]) => (selectedContactIds = ids)}
            />
        </div>

        <div class="flex justify-end pt-4">
            <AsyncButton
                type="submit"
                loading={remoteFunction.pending}
                class="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700"
            >
                {isUpdating ? "Save Changes" : "Create Announcement"}
            </AsyncButton>
            <Button
                variant="secondary"
                href="/announcements"
                size="default"
                class="ml-3"
            >
                Cancel
            </Button>
        </div>
    </form>
</div>
