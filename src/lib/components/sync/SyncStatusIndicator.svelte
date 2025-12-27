<script lang="ts">
	import { CircleCheck, Clock, CircleAlert, RefreshCw } from "@lucide/svelte";

	export let enabled: boolean;
	export let lastSyncAt: Date | null = null;
	export let syncing: boolean = false;
	export let size: "sm" | "md" | "lg" = "md";

	const sizeClasses = {
		sm: "h-4 w-4",
		md: "h-5 w-5",
		lg: "h-6 w-6",
	};

	$: iconClass = sizeClasses[size];

	$: statusInfo = (() => {
		if (syncing) {
			return {
				icon: RefreshCw,
				color: "text-blue-600",
				label: "Syncing...",
				animate: true,
			};
		}

		if (!enabled) {
			return {
				icon: CircleAlert,
				color: "text-gray-400",
				label: "Disabled",
				animate: false,
			};
		}

		if (!lastSyncAt) {
			return {
				icon: Clock,
				color: "text-yellow-500",
				label: "Never synced",
				animate: false,
			};
		}

		const hoursSinceSync =
			(Date.now() - new Date(lastSyncAt).getTime()) / (1000 * 60 * 60);

		if (hoursSinceSync > 24) {
			return {
				icon: CircleAlert,
				color: "text-orange-500",
				label: "Sync overdue",
				animate: false,
			};
		}

		return {
			icon: CircleCheck,
			color: "text-green-500",
			label: "Up to date",
			animate: false,
		};
	})();
</script>

<div class="inline-flex items-center gap-2">
	<svelte:component
		this={statusInfo.icon}
		class="{iconClass} {statusInfo.color} {statusInfo.animate
			? 'animate-spin'
			: ''}"
	/>
	<span class="text-sm {statusInfo.color}">
		{statusInfo.label}
	</span>
</div>
