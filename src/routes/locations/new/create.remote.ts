import { form } from '$app/server';
import { db } from '$lib/server/db';
import { location } from '$lib/server/db/schema';
import { listLocations } from '../list.remote';
import { getAuthenticatedUser, ensureAccess } from '$lib/authorization';
import { createLocationSchema } from '$lib/validations/locations';

export const createLocation = form(createLocationSchema, async (data) => {
    const user = getAuthenticatedUser();
    ensureAccess(user, 'locations');

    const result = await db.insert(location).values({
        userId: user.id,
        name: data.name,
        street: data.street || null,
        houseNumber: data.houseNumber || null,
        addressSuffix: data.addressSuffix || null,
        zip: data.zip || null,
        city: data.city || null,
        state: data.state || null,
        country: data.country || null,
        roomId: data.roomId || null,
        latitude: data.latitude ? parseFloat(data.latitude) : null,
        longitude: data.longitude ? parseFloat(data.longitude) : null,
        what3words: data.what3words || null,
        inclusivitySupport: data.inclusivitySupport || null,
    }).returning();

    await listLocations().refresh();
    return result[0];
});
