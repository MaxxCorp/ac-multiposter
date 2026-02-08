<script lang="ts">
    import * as Dialog from "$lib/components/ui/dialog";
    import { Button } from "$lib/components/ui/button";
    import { RRule, Frequency } from "$lib/utils/rrule-compat";
    import { createEventDispatcher } from "svelte";

    let { open = $bindable(false), value = $bindable<string | null>(null) } =
        $props();

    const dispatch = createEventDispatcher();

    // Internal state
    let freq = $state(RRule.WEEKLY);
    let interval = $state(1);
    let endType = $state("never"); // never, count, until
    let count = $state(10);
    let untilDate = $state<string>("");

    // Initialize state from existing value if present
    $effect(() => {
        console.log("RecurrenceDialog effect running", { open, value });
        if (open && value) {
            try {
                const rule = RRule.fromString(value);
                freq = rule.options.freq;
                interval = rule.options.interval;
                if (rule.options.count) {
                    endType = "count";
                    count = rule.options.count;
                } else if (rule.options.until) {
                    endType = "until";
                    // Format date to YYYY-MM-DD
                    untilDate = rule.options.until.toISOString().split("T")[0];
                } else {
                    endType = "never";
                }
            } catch (e) {
                console.error("Failed to parse recurrence rule", e);
            }
        } else if (open && !value) {
            // Reset to defaults
            freq = RRule.WEEKLY;
            interval = 1;
            endType = "never";
            count = 10;
            untilDate = "";
        }
    });

    function save() {
        const options: any = {
            freq,
            interval,
        };

        if (endType === "count") {
            options.count = Number(count);
        } else if (endType === "until" && untilDate) {
            options.until = new Date(untilDate);
        }

        try {
            const rule = new RRule(options);
            value = rule.toString();
            open = false;
            dispatch("change", value);
        } catch (e) {
            console.error("Invalid RRule options", e);
        }
    }

    function clear() {
        value = null;
        open = false;
        dispatch("change", null);
    }

    const frequencies = [
        { label: "Daily", value: RRule.DAILY },
        { label: "Weekly", value: RRule.WEEKLY },
        { label: "Monthly", value: RRule.MONTHLY },
        { label: "Yearly", value: RRule.YEARLY },
    ];
</script>

<Dialog.Root bind:open>
    <Dialog.Content class="sm:max-w-[425px]">
        <Dialog.Header>
            <Dialog.Title>Recurrence Settings</Dialog.Title>
            <Dialog.Description>
                Set the recurrence rules for this event.
            </Dialog.Description>
        </Dialog.Header>
        <div class="grid gap-6 py-4">
            <div class="grid grid-cols-4 items-center gap-4">
                <label
                    for="freq"
                    class="text-right text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >Repeat</label
                >
                <div class="col-span-3">
                    <select
                        id="freq"
                        bind:value={freq}
                        class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {#each frequencies as f}
                            <option value={f.value}>{f.label}</option>
                        {/each}
                    </select>
                </div>
            </div>

            <div class="grid grid-cols-4 items-center gap-4">
                <label
                    for="interval"
                    class="text-right text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >Every</label
                >
                <div class="col-span-3 flex items-center gap-2">
                    <input
                        id="interval"
                        type="number"
                        min="1"
                        bind:value={interval}
                        class="flex h-10 w-20 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    />
                    <span class="text-sm text-gray-500">
                        {freq === RRule.DAILY
                            ? "days"
                            : freq === RRule.WEEKLY
                              ? "weeks"
                              : freq === RRule.MONTHLY
                                ? "months"
                                : "years"}
                    </span>
                </div>
            </div>

            <div class="border-t pt-4">
                <div class="grid grid-cols-4 gap-4">
                    <label
                        class="text-right mt-2 text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                        >End</label
                    >
                    <div class="col-span-3 space-y-3">
                        <div class="flex items-center space-x-2">
                            <input
                                type="radio"
                                id="end-never"
                                value="never"
                                name="recurrence-end"
                                bind:group={endType}
                                class="aspect-square h-4 w-4 rounded-full border border-primary text-primary shadow focus:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                            />
                            <label
                                for="end-never"
                                class="font-normal text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                >Never</label
                            >
                        </div>

                        <div class="flex items-center space-x-2">
                            <input
                                type="radio"
                                id="end-count"
                                value="count"
                                name="recurrence-end"
                                bind:group={endType}
                                class="aspect-square h-4 w-4 rounded-full border border-primary text-primary shadow focus:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                            />
                            <label
                                for="end-count"
                                class="font-normal text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                >After</label
                            >
                            <input
                                type="number"
                                min="1"
                                bind:value={count}
                                disabled={endType !== "count"}
                                class="h-8 w-16 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                            />
                            <span class="text-sm text-muted-foreground"
                                >occurrences</span
                            >
                        </div>

                        <div class="flex items-center space-x-2">
                            <input
                                type="radio"
                                id="end-until"
                                value="until"
                                name="recurrence-end"
                                bind:group={endType}
                                class="aspect-square h-4 w-4 rounded-full border border-primary text-primary shadow focus:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                            />
                            <label
                                for="end-until"
                                class="font-normal text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                >On date</label
                            >
                            <input
                                type="date"
                                bind:value={untilDate}
                                disabled={endType !== "until"}
                                class="h-8 w-[140px] rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
        <Dialog.Footer>
            <Button variant="ghost" onclick={() => clear()}>Clear</Button>
            <Button onclick={save}>Save Recurrence</Button>
        </Dialog.Footer>
    </Dialog.Content>
</Dialog.Root>
