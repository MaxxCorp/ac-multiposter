import { form } from '$app/server';
import { db } from '$lib/server/db';
import { location } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';
import { listLocations } from '../list.remote';
import { readLocation } from './read.remote';
import { getAuthenticatedUser, ensureAccess } from '$lib/authorization';
import { updateLocationSchema } from '$lib/validations/locations';

export const updateLocation = form(updateLocationSchema, async (data) => {
    console.log('--- updateLocation START ---');
    console.log('Data received:', JSON.stringify(data, null, 2));

    try {
        const user = getAuthenticatedUser();
        ensureAccess(user, 'locations');
        console.log('User authenticated:', user.id);

        const updateData: any = {
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
            updatedAt: new Date(),
        };

        if (updateData.latitude && isNaN(updateData.latitude)) updateData.latitude = null;
        if (updateData.longitude && isNaN(updateData.longitude)) updateData.longitude = null;

        console.log('Update payload:', updateData);

        const result = await db.update(location)
            .set(updateData)
            .where(eq(location.id, data.id))
            .returning();

        console.log('Update result:', result);

        if (result.length === 0) {
            console.error('No rows updated. ID might be wrong or missing.');
            return { success: false, error: { message: 'Location not found or update failed' } };
        }

        const updated = result[0];
        await readLocation(data.id).refresh();
        await listLocations().refresh();

        console.log('--- updateLocation SUCCESS ---');
        return { success: true, location: updated };
    } catch (err: any) {
        console.error('--- updateLocation ERROR ---', err);
        return { success: false, error: { message: err.message || 'Update failed' } };
    }
});
