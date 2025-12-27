import { z } from "zod/mini";

export const createLocationSchema = z.object({
    name: z.string().check(z.minLength(1, "Name is required")),
    street: z.optional(z.string()),
    houseNumber: z.optional(z.string()),
    addressSuffix: z.optional(z.string()),
    zip: z.optional(z.string()),
    city: z.optional(z.string()),
    state: z.optional(z.string()),
    country: z.optional(z.string()),
    roomId: z.optional(z.string()),
    latitude: z.optional(z.number()),
    longitude: z.optional(z.number()),
    what3words: z.optional(z.string()),
    inclusivitySupport: z.optional(z.string()),
});

export const updateLocationSchema = z.object({
    id: z.string().check(z.minLength(1, "ID is required")),
    name: z.string().check(z.minLength(1, "Name is required")),
    street: z.optional(z.string()),
    houseNumber: z.optional(z.string()),
    addressSuffix: z.optional(z.string()),
    zip: z.optional(z.string()),
    city: z.optional(z.string()),
    state: z.optional(z.string()),
    country: z.optional(z.string()),
    roomId: z.optional(z.string()),
    latitude: z.optional(z.number()),
    longitude: z.optional(z.number()),
    what3words: z.optional(z.string()),
    inclusivitySupport: z.optional(z.string()),
});

export type CreateLocationSchema = z.infer<typeof createLocationSchema>;
export type UpdateLocationSchema = z.infer<typeof updateLocationSchema>;
