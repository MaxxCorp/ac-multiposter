<script lang="ts">
    import { goto } from "$app/navigation";
    import { createNewContact } from "./create.remote";
    import ContactForm from "$lib/components/contacts/ContactForm.svelte";
    import Breadcrumb from "$lib/components/ui/Breadcrumb.svelte";

    import { createContactSchema } from "$lib/validations/contacts";

    function handleSuccess(result: any) {
        if (result?.id) {
            goto(`/contacts/${result.id}`);
        } else {
            goto("/contacts");
        }
    }
</script>

<div class="container mx-auto px-4 py-8">
    <div class="max-w-2xl mx-auto">
        <Breadcrumb feature="contacts" />
        <div class="bg-white shadow rounded-lg p-6">
            <h1 class="text-2xl font-bold mb-6">Create New Contact</h1>
            <ContactForm
                remoteFunction={createNewContact}
                schema={createContactSchema}
                onSuccess={handleSuccess}
            />
        </div>
    </div>
</div>
