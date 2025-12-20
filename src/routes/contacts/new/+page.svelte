<script lang="ts">
    import { goto } from "$app/navigation";
    import { createNewContact } from "./create.remote";
    import ContactForm from "$lib/components/ContactForm.svelte";
    import Breadcrumb from "$lib/components/ui/Breadcrumb.svelte";
    import { toast } from "svelte-sonner";

    let loading = $state(false);

    async function handleSubmit(data: any) {
        loading = true;
        try {
            const result = await createNewContact(data);
            if (result.id) {
                toast.success("Contact created successfully");
                goto(`/contacts/${result.id}`);
            } else {
                toast.error("Failed to create contact");
            }
        } catch (error: any) {
            toast.error(error.message || "An error occurred");
        } finally {
            loading = false;
        }
    }
</script>

<div class="container mx-auto px-4 py-8">
    <div class="max-w-2xl mx-auto">
        <Breadcrumb feature="contacts" />
        <div class="bg-white shadow rounded-lg p-6">
            <h1 class="text-2xl font-bold mb-6">Create New Contact</h1>
            <ContactForm onsubmit={handleSubmit} {loading} />
        </div>
    </div>
</div>
