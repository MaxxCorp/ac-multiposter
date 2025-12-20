import { z } from "zod/mini";

export const updateUserSchema = z.object({
    id: z.string().check(z.minLength(1, "ID is required")),
    name: z.string().check(z.minLength(1, "Name is required")),
    email: z.string(),
    roles: z.optional(z.array(z.string())),
    claims: z.optional(z.string()),
});

export const deleteUserIdsSchema = z.array(z.string());
