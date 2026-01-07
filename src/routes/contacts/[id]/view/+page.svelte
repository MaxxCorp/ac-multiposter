<script lang="ts">
    import { page } from "$app/state";
    import { readContact } from "../read.remote";
    import ContactView from "$lib/components/contacts/ContactView.svelte";
    import Breadcrumb from "$lib/components/ui/Breadcrumb.svelte";
    import LoadingSection from "$lib/components/ui/LoadingSection.svelte";
    import ErrorSection from "$lib/components/ui/ErrorSection.svelte";
    import { goto } from "$app/navigation";

    const contactId = page.params.id || "";
    let itemsPromise = $state(readContact(contactId));

    // Check if the user is authorized to edit
    function checkCanEdit(contact: any) {
        const user = page.data.user as any;
        return (
            !!user &&
            (user.id === contact.userId || (user.roles || []).includes("admin"))
        );
    }
</script>

<div class="container mx-auto px-4 py-8">
    <div class="max-w-3xl mx-auto">
        {#await itemsPromise}
            <Breadcrumb feature="contacts" />
            <div
                class="bg-white shadow-xl rounded-2xl p-8 border border-gray-100"
            >
                <LoadingSection message="Loading contact profile..." />
            </div>
        {:then contact}
            {#if !contact}
                <Breadcrumb feature="contacts" />
                <div
                    class="bg-white shadow-xl rounded-2xl p-8 border border-gray-100"
                >
                    <ErrorSection
                        headline="Contact not found"
                        message="The contact you are looking for does not exist or you don't have access."
                        href="/contacts"
                        button="Back to Contacts"
                    />
                </div>
            {:else}
                <Breadcrumb
                    feature="contacts"
                    current={contact.displayName || undefined}
                />

                <div
                    class="bg-white shadow-xl rounded-2xl p-8 border border-gray-100"
                >
                    <ContactView
                        {contact}
                        canEdit={checkCanEdit(contact)}
                        onedit={() => goto(`/contacts/${contact.id}`)}
                    />
                </div>
            {/if}
        {:catch error}
            <Breadcrumb feature="contacts" />
            <div
                class="bg-white shadow-xl rounded-2xl p-8 border border-gray-100"
            >
                <ErrorSection
                    headline="Error loading contact"
                    message={error.message}
                    href="/contacts"
                    button="Back to Contacts"
                />
            </div>
        {/await}
    </div>
</div>
