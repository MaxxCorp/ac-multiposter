<script lang="ts">
    import AsyncButton from "$lib/components/ui/AsyncButton.svelte";
    import { toast } from "svelte-sonner";
    import { Button } from "$lib/components/ui/button";
    import { goto } from "$app/navigation";
    import { FEATURES } from "$lib/features";
    import type { updateUser } from "../../../routes/users/[id]/update.remote";
    import ContactManager from "$lib/components/contacts/ContactManager.svelte";

    let {
        remoteFunction,
        validationSchema,
        isUpdating = false,
        initialData = null,
    }: {
        remoteFunction: typeof updateUser;
        validationSchema: any;
        isUpdating?: boolean;
        initialData?: any;
    } = $props();

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

    // svelte-ignore state_referenced_locally
    const initialRoles =
        initialData?.roles && Array.isArray(initialData.roles)
            ? initialData.roles
            : [];

    // svelte-ignore state_referenced_locally
    const initialIsAdmin = initialRoles.includes("admin");

    // svelte-ignore state_referenced_locally
    const initialClaims =
        initialData?.claims && typeof initialData.claims === "object"
            ? (initialData.claims as Record<string, unknown>)
            : {};

    // svelte-ignore state_referenced_locally
    const initialClaimsMap: Record<string, boolean> = {};
    FEATURES.forEach((f) => {
        if (initialClaims[f.key]) initialClaimsMap[f.key] = true;
    });

    let isAdmin = $state(initialIsAdmin);
    let claimsMap = $state(initialClaimsMap);

    let claimsJson = $derived.by(() => {
        const c: Record<string, boolean> = {};
        for (const [k, v] of Object.entries(claimsMap)) {
            if (v) c[k] = true;
        }
        return JSON.stringify(c);
    });
</script>

<form
    class="space-y-4"
    {...remoteFunction
        .preflight(validationSchema)
        .enhance(async ({ submit }) => {
            try {
                const result: any = await submit();
                if (result?.error) {
                    toast.error(
                        result.error.message || "Oh no! Something went wrong",
                    );
                    return;
                }
                toast.success("Successfully Saved!");
                await goto("/users");
            } catch (error: unknown) {
                const err = error as { message?: string };
                toast.error(err?.message || "Oh no! Something went wrong");
            }
        })}
>
    {#if isUpdating && initialData}
        <input {...getField("id").as("hidden", initialData.id)} />
    {/if}

    <input {...getField("claims").as("hidden", claimsJson)} />

    <label class="block">
        <span class="text-sm font-medium text-gray-700 mb-2">Name</span>
        <input
            {...getField("name").as("text")}
            class="mt-2 w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 {(getField(
                'name',
            ).issues()?.length ?? 0) > 0
                ? 'border-red-500'
                : 'border-gray-300'}"
            value={initialData?.name ?? ""}
            onblur={() => remoteFunction.validate()}
        />
        {#each getField("name").issues() ?? [] as issue}
            <p class="mt-1 text-sm text-red-600">{issue.message}</p>
        {/each}
    </label>

    <label class="block">
        <span class="text-sm font-medium text-gray-700 mb-2">Email</span>
        <input
            {...getField("email").as("email")}
            class="mt-2 w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 {(getField(
                'email',
            ).issues()?.length ?? 0) > 0
                ? 'border-red-500'
                : 'border-gray-300'}"
            value={initialData?.email ?? ""}
            onblur={() => remoteFunction.validate()}
        />
        {#each getField("email").issues() ?? [] as issue}
            <p class="mt-1 text-sm text-red-600">{issue.message}</p>
        {/each}
    </label>

    <div class="border-t pt-4 mt-4">
        <h3 class="text-lg font-medium text-gray-900 mb-2">Roles</h3>
        <label class="flex items-center space-x-2">
            <input
                {...getField("roles").as("checkbox", "admin")}
                value="admin"
                checked={isAdmin}
                onchange={(e) => (isAdmin = e.currentTarget.checked)}
                class="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
            />
            <span class="text-sm text-gray-700">Admin</span>
        </label>
    </div>

    <div class="border-t pt-4 mt-4">
        <h3 class="text-lg font-medium text-gray-900 mb-2">
            Claims (Feature Access)
        </h3>
        <div class="grid grid-cols-2 gap-4">
            {#each FEATURES as feature}
                <label class="flex items-center space-x-2">
                    <input
                        type="checkbox"
                        checked={claimsMap[feature.key]}
                        onchange={(e) => {
                            claimsMap[feature.key] = e.currentTarget.checked;
                        }}
                        class="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                    />
                    <span class="text-sm text-gray-700">{feature.title}</span>
                </label>
            {/each}
        </div>
    </div>

    {#if isUpdating && initialData?.id}
        <ContactManager type="user" entityId={initialData.id} />
    {/if}

    <div class="flex gap-3 mt-6">
        <AsyncButton
            type="submit"
            loadingLabel={isUpdating ? "Saving..." : "Creating..."}
            loading={remoteFunction.pending}
        >
            {isUpdating ? "Save Changes" : "Create User"}
        </AsyncButton>
        <Button variant="secondary" href="/users" size="default">Cancel</Button>
    </div>
</form>
