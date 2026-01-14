import * as v from 'valibot';

export const locationBaseSchema = v.object({
    name: v.pipe(v.string(), v.minLength(1, 'Name is required')),
    street: v.optional(v.string()),
    houseNumber: v.optional(v.string()),
    addressSuffix: v.optional(v.string()),
    zip: v.optional(v.string()),
    city: v.optional(v.string()),
    state: v.optional(v.string()),
    country: v.optional(v.string()),
    roomId: v.optional(v.string()),
    latitude: v.optional(v.string()),
    longitude: v.optional(v.string()),
    what3words: v.optional(v.string()),
    inclusivitySupport: v.optional(v.string()),
});

export const createLocationSchema = locationBaseSchema;
export const updateLocationSchema = v.intersect([
    locationBaseSchema,
    v.object({ id: v.pipe(v.string(), v.uuid()) })
]);
