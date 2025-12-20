import { z } from 'zod/mini';

export const ContactSchema = z.object({
    id: z.string(),
    userId: z.string(),
    displayName: z.optional(z.string()),
    givenName: z.optional(z.string()),
    familyName: z.optional(z.string()),
    middleName: z.optional(z.string()),
    honorificPrefix: z.optional(z.string()),
    honorificSuffix: z.optional(z.string()),
    birthday: z.optional(z.string()),
    gender: z.optional(z.string()),
    notes: z.optional(z.string()),
    isPublic: z.boolean(),
    vCardPath: z.optional(z.string()),
    qrCodePath: z.optional(z.string()),
    createdAt: z.string(),
    updatedAt: z.string(),
    emails: z.optional(z.array(z.object({
        id: z.string(),
        value: z.string(),
        type: z.optional(z.string()),
        primary: z.boolean(),
    }))),
    phones: z.optional(z.array(z.object({
        id: z.string(),
        value: z.string(),
        type: z.optional(z.string()),
        primary: z.boolean(),
    }))),
    addresses: z.optional(z.array(z.object({
        id: z.string(),
        street: z.optional(z.string()),
        houseNumber: z.optional(z.string()),
        addressSuffix: z.optional(z.string()),
        zip: z.optional(z.string()),
        city: z.optional(z.string()),
        state: z.optional(z.string()),
        country: z.optional(z.string()),
        type: z.optional(z.string()),
        primary: z.boolean(),
    }))),
    relations: z.optional(z.array(z.object({
        id: z.string(),
        targetContactId: z.string(),
        relationType: z.string(),
        targetContact: z.optional(z.any()), // For UI display
    }))),
    tags: z.optional(z.array(z.object({
        id: z.string(),
        name: z.string(),
    }))),
});

export type Contact = z.infer<typeof ContactSchema>;
