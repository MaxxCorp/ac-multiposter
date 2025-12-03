<script lang="ts">
    // Loosen icon typing to accept any Svelte component
    interface Props {
      icon?: any;
      title: string;
      description: string;
      actionLabel: string;
      actionHref: string;
    }

    let { icon: Icon, title, description, actionLabel, actionHref }: Props = $props();
// ...existing code...
</script>

<div class="rounded-lg border border-gray-200 bg-white p-8 text-center">
  <div class="text-center py-8">
    {#if Icon}
      <Icon class="h-16 w-16 text-gray-300 mx-auto mb-4" />
    {/if}
    <h2 class="text-xl font-semibold text-gray-700 mb-2">{title}</h2>
    <p class="text-gray-500 mb-4">{description}</p>
    <a href={actionHref} class="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700">{actionLabel}</a>
  </div>
</div>
