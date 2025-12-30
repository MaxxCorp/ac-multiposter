<script lang="ts">
    import type { User } from "../list.remote";
    import { updateUser } from "./update.remote";
    import { deleteUsers } from "./delete.remote";
    import AsyncButton from "$lib/components/ui/AsyncButton.svelte";
    import { toast } from "svelte-sonner";
    import { updateUserSchema } from "$lib/validations/user";
    import { Button } from "$lib/components/ui/button";
    import { handleDelete } from "$lib/hooks/handleDelete.svelte";
    import { FEATURES } from "$lib/features";
    import { goto } from "$app/navigation";
    import ContactManager from "$lib/components/contacts/ContactManager.svelte";

    let { user }: { user: User } = $props();

    // svelte-ignore state_referenced_locally
    // Intentionally capture initial prop values for form state
    const initialRoles = Array.isArray(user.roles) ? user.roles : [];
    const initialIsAdmin = initialRoles.includes("admin");
    const initialClaims =
        user.claims && typeof user.claims === "object"
            ? (user.claims as Record<string, unknown>)
            : {};
    const initialClaimsMap: Record<string, boolean> = {};
    FEATURES.forEach((f) => {
        if (initialClaims[f.key]) initialClaimsMap[f.key] = true;
    });

    // Initialize state from extracted values
    let isAdmin = $state(initialIsAdmin);
    let claimsMap = $state(initialClaimsMap);

    // Derived claims JSON using deep reactivity
    let claimsJson = $derived.by(() => {
        const c: Record<string, boolean> = {};
        for (const [k, v] of Object.entries(claimsMap)) {
            if (v) c[k] = true;
        }
        return JSON.stringify(c);
    });
</script>

<div class="bg-white shadow rounded-lg p-6 space-y-4">
    <div class="flex justify-between items-start mb-6">
        <div>
            <h1 class="text-3xl font-bold mb-2">
                {user.name}
            </h1>
            <p class="text-gray-500">{user.email}</p>
        </div>
        <div class="flex gap-2">
            <AsyncButton
                type="button"
                loadingLabel="Deleting..."
                loading={deleteUsers.pending}
                variant="destructive"
                onclick={async () => {
                    await handleDelete({
                        ids: [user.id],
                        deleteFn: deleteUsers,
                        itemName: "user",
                    });
                    goto("/users");
                }}
            >
                Delete
            </AsyncButton>
        </div>
    </div>
    <h2 class="text-xl font-semibold mb-4">Edit User</h2>
    <form
        {...updateUser
            .preflight(updateUserSchema)
            .enhance(async ({ submit }) => {
                try {
                    const result: any = await submit();
                    if (result?.error) {
                        toast.error(result.error.message || "Failed to save");
                        return;
                    }
                    toast.success("Successfully saved!");
                    goto("/users");
                } catch (error: any) {
                    toast.error(error?.message || "Failed to save");
                }
            })}
        class="space-y-4"
    >
        <input {...updateUser.fields.id.as("hidden", user.id)} />

        <!-- Claims JSON hidden input -->
        <input {...updateUser.fields.claims.as("hidden", claimsJson)} />

        <label class="block">
            <span class="text-sm font-medium text-gray-700 mb-2">Name</span>
            <input
                {...updateUser.fields.name.as("text")}
                class="mt-2 w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 border-gray-300"
                value={updateUser.fields.name.value() ?? user.name}
            />
        </label>

        <label class="block">
            <span class="text-sm font-medium text-gray-700 mb-2">Email</span>
            <input
                {...updateUser.fields.email.as("email")}
                class="mt-2 w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 border-gray-300"
                value={updateUser.fields.email.value() ?? user.email}
            />
        </label>

        <div class="border-t pt-4 mt-4">
            <h3 class="text-lg font-medium text-gray-900 mb-2">Roles</h3>
            <label class="flex items-center space-x-2">
                <input
                    {...updateUser.fields.roles.as("checkbox", "admin")}
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
                                claimsMap[feature.key] =
                                    e.currentTarget.checked;
                            }}
                            class="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                        />
                        <span class="text-sm text-gray-700"
                            >{feature.title}</span
                        >
                    </label>
                {/each}
            </div>
        </div>

        <ContactManager type="user" entityId={user.id} />

        <div class="flex gap-3 mt-6">
            <AsyncButton
                type="submit"
                loadingLabel="Saving..."
                loading={updateUser.pending}
            >
                Save Changes
            </AsyncButton>
            <Button variant="secondary" href="/users" size="default">
                Cancel
            </Button>
        </div>
    </form>
</div>
