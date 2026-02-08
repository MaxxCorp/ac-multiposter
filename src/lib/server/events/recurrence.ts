import { RRule } from '$lib/utils/rrule-compat';

export function expandRecurrence(
    recurrenceRule: string,
    start: Date,
    end: Date | null,
    limitCount: number = 50,
    limitYear: boolean = true
): { date: Date; end: Date | null }[] {
    try {
        const ruleOptions = RRule.parseString(recurrenceRule);

        // Default safety limits
        if (!ruleOptions.count && !ruleOptions.until) {
            ruleOptions.count = limitCount;
        }

        ruleOptions.dtstart = start;

        // Re-create rule with start date context
        const rruleObj = new RRule(ruleOptions);

        const now = new Date();
        const oneYearFromNow = new Date(now.getFullYear() + 1, now.getMonth(), now.getDate());

        const allDates = rruleObj.all((date: Date, i: number) => {
            if (limitYear && date >= oneYearFromNow) return false;
            return i < limitCount * 2; // Safety break
        });

        // Duration for end time calculation
        const durationMs = end ? end.getTime() - start.getTime() : 0;

        const instances: { date: Date; end: Date | null }[] = [];

        for (const date of allDates) {
            // Skip the master event instance (same start time)
            console.log(`Comparing ${date.toISOString()} (${date.getTime()}) with start ${start.toISOString()} (${start.getTime()})`);
            if (date.getTime() === start.getTime()) continue;


            const instanceEnd = end ? new Date(date.getTime() + durationMs) : null;
            instances.push({ date, end: instanceEnd });

            if (instances.length >= limitCount) break;
        }

        return instances;
    } catch (e) {
        console.error('Error expanding recurrence:', e);
        return [];
    }
}
