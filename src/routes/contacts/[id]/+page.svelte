<script lang="ts">
    import { page } from "$app/state";
    import { readContact } from "./read.remote";
    import { updateExistingContact } from "./update.remote";
    import ContactForm from "$lib/components/contacts/ContactForm.svelte";
    import Breadcrumb from "$lib/components/ui/Breadcrumb.svelte";
    import LoadingSection from "$lib/components/ui/LoadingSection.svelte";
    import ErrorSection from "$lib/components/ui/ErrorSection.svelte";
    import { goto } from "$app/navigation";

    import { updateContactSchema } from "$lib/validations/contacts";

    const contactId = page.params.id || "";
    let itemsPromise = $state(readContact(contactId));

    function handleSuccess(result: any) {
        // Redirect to list page on success
        goto(`/contacts`);
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
                    <div class="flex justify-between items-center mb-4">
                        <h1 class="text-2xl font-bold">Edit Contact</h1>
                        <button
                            class="text-sm text-gray-500 hover:text-gray-700 underline"
                            onclick={() => goto(`/contacts/${contactId}/view`)}
                        >
                            Cancel Edit
                        </button>
                    </div>
                    <ContactForm
                        remoteFunction={updateExistingContact}
                        schema={updateContactSchema}
                        onSuccess={handleSuccess}
                        contactId={contact.id}
                        initialData={{
                            contact,
                            emails: contact.emails,
                            phones: contact.phones,
                            addresses: contact.addresses,
                            tags: contact.tags,
                            relations: contact.relations,
                        }}
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
