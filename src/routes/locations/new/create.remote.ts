import { form } from '$app/server';
import { db } from '$lib/server/db';
import { location } from '$lib/server/db/schema';
import { listLocations } from '../list.remote';
import { getAuthenticatedUser, ensureAccess } from '$lib/authorization';
import { createLocationSchema } from '$lib/validations/locations';

export const createLocation = form(createLocationSchema, async (data) => {
    console.log('--- createLocation START ---');
    console.log('Data received:', JSON.stringify(data, null, 2));

    try {
        const user = getAuthenticatedUser();
        ensureAccess(user, 'locations');
        console.log('User authenticated:', user.id);

        const insertData: any = {
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
        };

        if (insertData.latitude && isNaN(insertData.latitude)) insertData.latitude = null;
        if (insertData.longitude && isNaN(insertData.longitude)) insertData.longitude = null;

        console.log('Insert payload:', insertData);

        const result = await db.insert(location).values(insertData).returning();

        if (result.length === 0) {
            throw new Error('Failed to create location');
        }

        const newLocation = result[0];
        await listLocations().refresh();

        console.log('--- createLocation SUCCESS ---');
        return { success: true, location: newLocation };

    } catch (err: any) {
        console.error('--- createLocation ERROR ---', err);
        return { success: false, error: { message: err.message || 'Creation failed' } };
    }
});
