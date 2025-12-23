import { db } from '../db';
import { event as eventTable } from '../db/schema';
import { eq } from 'drizzle-orm';
import QRCode from 'qrcode';
import ICAL from 'ical.js';
import fs from 'fs';
import path from 'path';

/**
 * Generate iCal and QR Code for an event
 */
export async function generateEventAssets(eventId: string) {
    const data = await db.query.event.findFirst({
        where: (table, { eq }) => eq(table.id, eventId),
    });

    if (!data) return;

    // iCal generation using ical.js
    const vcalendar = new ICAL.Component(['vcalendar', [], []]);
    vcalendar.addPropertyWithValue('prodid', '-//MaxxCorp//ac-multiposter//EN');
    vcalendar.addPropertyWithValue('version', '2.0');

    const vevent = new ICAL.Component('vevent');

    vevent.addPropertyWithValue('uid', data.iCalUID || eventId);
    vevent.addPropertyWithValue('summary', data.summary);
    if (data.description) vevent.addPropertyWithValue('description', data.description);
    if (data.location) vevent.addPropertyWithValue('location', data.location);

    // Handle dates
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

    const eventDir = path.join(process.cwd(), 'static', 'events');
    if (!fs.existsSync(eventDir)) {
        fs.mkdirSync(eventDir, { recursive: true });
    }

    const iCalFileName = `${eventId}.ics`;
    const fullICalPath = path.join(eventDir, iCalFileName);
    fs.writeFileSync(fullICalPath, vcalendar.toString());

    // QR Code generation
    const baseUrl = process.env.PUBLIC_BASE_URL || '';
    const eventUrl = `${baseUrl}/events/${eventId}`;
    const qrCodeFileName = `${eventId}.png`;
    const fullQRPath = path.join(eventDir, qrCodeFileName);

    await QRCode.toFile(fullQRPath, eventUrl, {
        width: 300,
        margin: 2,
        color: {
            dark: '#1e40af', // blue-800
            light: '#ffffff'
        }
    });

    // Update paths in DB
    await db.update(eventTable)
        .set({
            iCalPath: `/events/${iCalFileName}`,
            qrCodePath: `/events/${qrCodeFileName}`
        })
        .where(eq(eventTable.id, eventId));
}
