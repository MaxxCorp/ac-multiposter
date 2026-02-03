import { query } from '$app/server';
import { db } from '$lib/server/db';
import { kiosk, kioskLocation, location } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';
import { getAuthenticatedUser, ensureAccess } from '$lib/authorization';
import * as v from 'valibot';

export const getKiosk = query(v.string(), async (id: string) => {
    const user = getAuthenticatedUser();
    ensureAccess(user, 'kiosks');

    const result = await db.query.kiosk.findFirst({
        where: eq(kiosk.id, id),
    });

    if (!result) return null;

    const locations = await db
        .select({ id: kioskLocation.locationId })
        .from(kioskLocation)
        .where(eq(kioskLocation.kioskId, id));

    return {
        ...result,
        locationIds: locations.map(l => l.id),
    };
});

export const getKioskForDisplay = query(v.string(), async (id: string) => {
    // Public access allowed for Kiosk display

    const result = await db.query.kiosk.findFirst({
        where: eq(kiosk.id, id),
    });

    if (!result) return null;

    const locations = await db
        .select({ name: location.name })
        .from(kioskLocation)
        .innerJoin(location, eq(kioskLocation.locationId, location.id))
        .where(eq(kioskLocation.kioskId, id));

    return {
        ...result,
        locations: locations.map(l => l.name),
    };
});
