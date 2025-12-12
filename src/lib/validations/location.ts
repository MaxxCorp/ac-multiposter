import { z } from "zod";

export const createLocationSchema = z.object({
    name: z.string().min(1, "Name is required"),
    street: z.string().optional(),
    houseNumber: z.string().optional(),
    addressSuffix: z.string().optional(),
    zip: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    country: z.string().optional(),
    roomId: z.string().optional(),
    latitude: z.number().optional(),
    longitude: z.number().optional(),
    what3words: z.string().optional(),
});

export const updateLocationSchema = createLocationSchema.extend({
    id: z.string().min(1, "ID is required"),
});

export type CreateLocationSchema = z.infer<typeof createLocationSchema>;
export type UpdateLocationSchema = z.infer<typeof updateLocationSchema>;
