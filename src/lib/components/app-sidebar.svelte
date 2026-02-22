<script lang="ts">
	import NavMain from "./nav-main.svelte";
	import NavUser from "./nav-user.svelte";
	import * as Sidebar from "$lib/components/ui/sidebar/index.js";
	import type { ComponentProps } from "svelte";
	import { getVisibleFeatures } from "$lib/features";
	import { hasAccess } from "$lib/authorization";
	import { authClient } from "$lib/auth-client";
	import { onMount } from "svelte";
	import { ICONS } from "$lib/icons";
	import FileTextIcon from "@lucide/svelte/icons/file-text";
	import LayersIcon from "@lucide/svelte/icons/layers";
	import LogInIcon from "@lucide/svelte/icons/log-in";
	import UserPlusIcon from "@lucide/svelte/icons/user-plus";

	let {
		ref = $bindable(null),
		collapsible = "icon",
		...restProps
	}: ComponentProps<typeof Sidebar.Root> = $props();

	let user = $state<any>(null);
	let navMain = $state<any[]>([]);

	onMount(async () => {
		const session = await authClient.getSession();
		if (session?.data?.user) {
			user = session.data.user;

			const platformFeatures = getVisibleFeatures(user, hasAccess).map(
				(f) => ({
					title: f.title,
					url: f.href,
					iconPath: ICONS[f.icon].path,
				}),
			);

			navMain = [
				{
					title: "Features",
					url: "#",
					icon: LayersIcon,
					isActive: true,
					items: platformFeatures,
				},
			];
		}
	});
</script>

<Sidebar.Root {collapsible} {...restProps}>
	<Sidebar.Header>
		<Sidebar.Menu>
			<Sidebar.MenuItem>
				<Sidebar.MenuButton
					size="lg"
					class="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
				>
					{#snippet child({ props })}
						<a href="/" {...props}>
							<div
								class="flex aspect-square size-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 to-purple-600 text-white shrink-0"
							>
								<span class="font-bold text-xs">AC</span>
							</div>
							<div
								class="grid flex-1 text-left text-sm leading-tight"
							>
								<span
									class="truncate font-semibold text-lg text-gray-900"
									>Multiposter</span
								>
							</div>
						</a>
					{/snippet}
				</Sidebar.MenuButton>
			</Sidebar.MenuItem>
		</Sidebar.Menu>
	</Sidebar.Header>

	<Sidebar.Content>
		<NavMain items={navMain} />
	</Sidebar.Content>

	<Sidebar.Footer>
		<Sidebar.Menu>
			<Sidebar.MenuItem>
				<Sidebar.MenuButton tooltipContent="Imprint">
					{#snippet child({ props })}
						<a href="/imprint" {...props}>
							<FileTextIcon />
							<span>Imprint</span>
						</a>
					{/snippet}
				</Sidebar.MenuButton>
			</Sidebar.MenuItem>
			<Sidebar.MenuItem>
				<Sidebar.MenuButton tooltipContent="Data Privacy">
					{#snippet child({ props })}
						<a href="/GDPR" {...props}>
							<FileTextIcon />
							<span>Data Privacy</span>
						</a>
					{/snippet}
				</Sidebar.MenuButton>
			</Sidebar.MenuItem>
		</Sidebar.Menu>

		{#if user}
			<NavUser
				user={{
					name: user.name || user.email,
					email: user.email,
					avatar: user.image,
				}}
			/>
		{:else}
			<Sidebar.Menu>
				<Sidebar.MenuItem>
					<Sidebar.MenuButton tooltipContent="Log In">
						{#snippet child({ props })}
							<a href="/login" {...props}>
								<LogInIcon />
								<span>Log In</span>
							</a>
						{/snippet}
					</Sidebar.MenuButton>
				</Sidebar.MenuItem>
				<Sidebar.MenuItem>
					<Sidebar.MenuButton tooltipContent="Sign Up">
						{#snippet child({ props })}
							<a href="/signup" {...props}>
								<UserPlusIcon />
								<span>Sign Up</span>
							</a>
						{/snippet}
					</Sidebar.MenuButton>
				</Sidebar.MenuItem>
			</Sidebar.Menu>
		{/if}
	</Sidebar.Footer>

	<Sidebar.Rail />
</Sidebar.Root>
