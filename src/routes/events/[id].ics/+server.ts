import { error } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import ICAL from 'ical.js';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params }) => {
    const eventId = params.id;

    const data = await db.query.event.findFirst({
        where: (table, { eq }) => eq(table.id, eventId),
    });

    if (!data) {
        throw error(404, 'Event not found');
    }

    // iCal generation (logic copied from events/assets.ts)
    const vcalendar = new ICAL.Component(['vcalendar', [], []]);
    vcalendar.addPropertyWithValue('prodid', '-//MaxxCorp//ac-multiposter//EN');
    vcalendar.addPropertyWithValue('version', '2.0');

    const vevent = new ICAL.Component('vevent');

    vevent.addPropertyWithValue('uid', data.iCalUID || eventId);
    vevent.addPropertyWithValue('summary', data.summary);
    if (data.description) vevent.addPropertyWithValue('description', data.description);
    if (data.location) vevent.addPropertyWithValue('location', data.location);

    if (data.startDateTime) {
        vevent.addPropertyWithValue('dtstart', ICAL.Time.fromJSDate(data.startDateTime, true));
    } else if (data.startDate) {
        const t = ICAL.Time.fromString(data.startDate);
        t.isDate = true;
        vevent.addPropertyWithValue('dtstart', t);
    }

    if (data.endDateTime) {
        vevent.addPropertyWithValue('dtend', ICAL.Time.fromJSDate(data.endDateTime, true));
    } else if (data.endDate) {
        const t = ICAL.Time.fromString(data.endDate);
        t.isDate = true;
        vevent.addPropertyWithValue('dtend', t);
    }

    vevent.addPropertyWithValue('dtstamp', ICAL.Time.fromJSDate(new Date(), true));
    vcalendar.addSubcomponent(vevent);

    return new Response(vcalendar.toString(), {
        headers: {
            'Content-Type': 'text/calendar',
            'Content-Disposition': `attachment; filename="${data.summary.replace(/\s+/g, '_')}.ics"`
        }
    });
};
