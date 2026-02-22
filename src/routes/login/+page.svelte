<script lang="ts">
    import LoginForm from "$lib/components/login-form.svelte";
</script>

<div class="grid min-h-svh lg:grid-cols-2">
    <div class="flex flex-col gap-4 p-6 md:p-10">
        <div class="flex justify-center gap-2 md:justify-start">
            <a href="/" class="flex items-center gap-2 font-medium">
                <div
                    class="w-8 h-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center"
                >
                    <span class="text-white font-bold text-sm">AC</span>
                </div>
                <span class="text-xl font-semibold text-gray-900"
                    >AC Multiposter</span
                >
            </a>
        </div>
        <div class="flex flex-1 items-center justify-center">
            <div class="w-full max-w-xs">
                <LoginForm />
            </div>
        </div>
    </div>
    <div class="bg-muted relative hidden lg:block">
        <img
            src="https://images.unsplash.com/photo-1517486808906-6ca8b3f04846?q=80&w=2698&auto=format&fit=crop"
            alt="Workspace"
            class="absolute inset-0 h-full w-full object-cover dark:brightness-[0.2] dark:grayscale"
        />
    </div>
</div>
