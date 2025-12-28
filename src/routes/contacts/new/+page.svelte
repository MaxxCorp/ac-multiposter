<script lang="ts">
    import { goto } from "$app/navigation";
    import { createNewContact } from "./create.remote";
    import ContactForm from "$lib/components/ContactForm.svelte";
    import Breadcrumb from "$lib/components/ui/Breadcrumb.svelte";
    import { toast } from "svelte-sonner";

    import { ContactInputSchema } from "$lib/validations/contacts";

    let loading = $derived(createNewContact.pending > 0);

    async function handleSuccess(result: any) {
        if (result?.error) {
            toast.error(result.error.message || "Oh no! Something went wrong");
            return;
        }
        toast.success("Contact created successfully");
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
                preflightSchema={ContactInputSchema}
                onSuccess={handleSuccess}
                {loading}
            />
        </div>
    </div>
</div>
