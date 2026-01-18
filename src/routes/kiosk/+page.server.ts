import { listPublicEvents } from '../events/list-public.remote';

export const load = async () => {
    // Fetch public events for the kiosk loop
    const events = await listPublicEvents();
    return { events };
};
