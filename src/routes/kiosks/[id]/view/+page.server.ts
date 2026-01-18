import { listKioskEvents } from '../../../events/list-public.remote';
import { db } from '$lib/server/db';
import { kiosk } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { error } from '@sveltejs/kit';

export const load = async ({ params, depends }) => {
    depends('app:events');
    const kioskData = await db.query.kiosk.findFirst({
        where: eq(kiosk.id, params.id),
        with: {
            location: true
        }
    });

    if (!kioskData) throw error(404, 'Kiosk not found');

    const events = await listKioskEvents(params.id);

    return {
        kiosk: kioskData,
        events
    };
};
