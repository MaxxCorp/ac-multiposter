import * as v from 'valibot';

export const userBaseSchema = v.object({
    id: v.pipe(v.string()),
    email: v.pipe(v.string(), v.email()),
    name: v.pipe(v.string(), v.minLength(1)),
    roles: v.optional(v.array(v.string())),
    claims: v.optional(v.any()),
});

export const updateUserSchema = v.intersect([
    v.object({ id: v.pipe(v.string()) }),
    v.partial(v.omit(userBaseSchema, ['id']))
]);

export const deleteUserSchema = v.array(v.string());


// Add type for better compatibility if needed, though user table is exported from schema
// export type User = v.InferOutput<typeof userBaseSchema>;
