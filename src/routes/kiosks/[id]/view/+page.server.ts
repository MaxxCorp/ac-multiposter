import { listKioskEvents } from '../../../events/list-public.remote';
import { db } from '$lib/server/db';
import { kiosk, kioskLocation, location } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { error } from '@sveltejs/kit';

export const load = async ({ params, depends }) => {
    depends('app:events');
    const kioskData = await db.query.kiosk.findFirst({
        where: eq(kiosk.id, params.id),
    });

    if (!kioskData) throw error(404, 'Kiosk not found');

    const locations = await db
        .select({ name: location.name })
        .from(kioskLocation)
        .innerJoin(location, eq(kioskLocation.locationId, location.id))
        .where(eq(kioskLocation.kioskId, params.id));

    const kioskWithLocations = {
        ...kioskData,
        locations: locations.map(l => l.name)
    };

    const events = await listKioskEvents(params.id);

    return {
        kiosk: kioskWithLocations,
        events
    };
};
