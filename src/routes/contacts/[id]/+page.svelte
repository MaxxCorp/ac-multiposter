<script lang="ts">
    import { page } from "$app/state";
    import { readContact } from "./read.remote";
    import { updateExistingContact } from "./update.remote";
    import ContactForm from "$lib/components/ContactForm.svelte";
    import ContactView from "$lib/components/ContactView.svelte";
    import Breadcrumb from "$lib/components/ui/Breadcrumb.svelte";
    import LoadingSection from "$lib/components/ui/LoadingSection.svelte";
    import ErrorSection from "$lib/components/ui/ErrorSection.svelte";
    import { toast } from "svelte-sonner";

    const contactId = page.params.id || "";
    let itemsPromise = $state(readContact(contactId));
    let loading = $state(false);
    let mode = $state<"view" | "edit">("view");

    // Check if the user is authorized to edit
    function checkCanEdit(contact: any) {
        const user = page.data.user as any;
        return (
            !!user &&
            (user.id === contact.userId || (user.roles || []).includes("admin"))
        );
    }

    async function handleSubmit(data: any) {
        loading = true;
        try {
            await updateExistingContact({ id: contactId, data });
            toast.success("Contact updated successfully");
            itemsPromise = readContact(contactId);
            mode = "view";
        } catch (error: any) {
            toast.error(error.message || "An error occurred");
        } finally {
            loading = false;
        }
    }
</script>

<div class="container mx-auto px-4 py-8">
    <div class="max-w-3xl mx-auto">
        <Breadcrumb feature="contacts" />
        <div class="bg-white shadow-xl rounded-2xl p-8 border border-gray-100">
            {#await itemsPromise}
                <LoadingSection message="Loading contact profile..." />
            {:then contact}
                {#if !contact}
                    <ErrorSection
                        headline="Contact not found"
                        message="The contact you are looking for does not exist or you don't have access."
                        href="/contacts"
                        button="Back to Contacts"
                    />
                {:else if mode === "view"}
                    <ContactView
                        {contact}
                        canEdit={checkCanEdit(contact)}
                        onedit={() => (mode = "edit")}
                    />
                {:else}
                    <div class="flex justify-between items-center mb-6">
                        <h1 class="text-2xl font-bold">Edit Contact</h1>
                        <button
                            class="text-sm text-gray-500 hover:text-gray-700 underline"
                            onclick={() => (mode = "view")}
                        >
                            Cancel Edit
                        </button>
                    </div>
                    <ContactForm
                        initialData={{
                            contact,
                            emails: contact.emails,
                            phones: contact.phones,
                            addresses: contact.addresses,
                            tags: contact.tags,
                            relations: contact.relations,
                        }}
                        onsubmit={handleSubmit}
                        {loading}
                    />
                {/if}
            {:catch error}
                <ErrorSection
                    headline="Error loading contact"
                    message={error.message}
                    href="/contacts"
                    button="Back to Contacts"
                />
            {/await}
        </div>
    </div>
</div>
