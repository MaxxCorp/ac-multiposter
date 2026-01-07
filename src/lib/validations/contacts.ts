import { z } from 'zod/mini';

export const ContactSchema = z.object({
    id: z.string(),
    userId: z.string(),
    displayName: z.optional(z.union([z.string(), z.null()])),
    givenName: z.optional(z.union([z.string(), z.null()])),
    familyName: z.optional(z.union([z.string(), z.null()])),
    middleName: z.optional(z.union([z.string(), z.null()])),
    honorificPrefix: z.optional(z.union([z.string(), z.null()])),
    honorificSuffix: z.optional(z.union([z.string(), z.null()])),
    birthday: z.optional(z.union([z.string(), z.null()])),
    gender: z.optional(z.union([z.string(), z.null()])),
    notes: z.optional(z.union([z.string(), z.null()])),
    isPublic: z.boolean(),
    vCardPath: z.optional(z.union([z.string(), z.null()])),
    qrCodePath: z.optional(z.union([z.string(), z.null()])),
    createdAt: z.string(),
    updatedAt: z.string(),
    participationStatus: z.optional(z.union([z.string(), z.null()])),
    emails: z.optional(z.union([z.array(z.object({
        id: z.string(),
        value: z.string(),
        type: z.optional(z.union([z.string(), z.null()])),
        primary: z.boolean(),
    })), z.null()])),
    phones: z.optional(z.union([z.array(z.object({
        id: z.string(),
        value: z.string(),
        type: z.optional(z.union([z.string(), z.null()])),
        primary: z.boolean(),
    })), z.null()])),
    addresses: z.optional(z.union([z.array(z.object({
        id: z.string(),
        street: z.optional(z.union([z.string(), z.null()])),
        houseNumber: z.optional(z.union([z.string(), z.null()])),
        addressSuffix: z.optional(z.union([z.string(), z.null()])),
        zip: z.optional(z.union([z.string(), z.null()])),
        city: z.optional(z.union([z.string(), z.null()])),
        state: z.optional(z.union([z.string(), z.null()])),
        country: z.optional(z.union([z.string(), z.null()])),
        type: z.optional(z.union([z.string(), z.null()])),
        primary: z.boolean(),
    })), z.null()])),
    relations: z.optional(z.union([z.array(z.object({
        id: z.string(),
        targetContactId: z.string(),
        relationType: z.string(),
        targetContact: z.optional(z.any()), // For UI display
    })), z.null()])),
    tags: z.optional(z.union([z.array(z.object({
        id: z.string(),
        name: z.string(),
    })), z.null()])),
});

export type Contact = z.infer<typeof ContactSchema>;

export const ContactInputSchema = z.object({
    contact: z.object({
        displayName: z.string().check(z.minLength(1, 'Display name is required')),
        givenName: z.optional(z.union([z.string(), z.null()])),
        familyName: z.optional(z.union([z.string(), z.null()])),
        middleName: z.optional(z.union([z.string(), z.null()])),
        honorificPrefix: z.optional(z.union([z.string(), z.null()])),
        honorificSuffix: z.optional(z.union([z.string(), z.null()])),
        birthday: z.optional(z.union([z.string(), z.null()])),
        gender: z.optional(z.union([z.string(), z.null()])),
        notes: z.optional(z.union([z.string(), z.null()])),
        isPublic: z.optional(z.union([z.boolean(), z.string(), z.null()])),
    }),
    emails: z.optional(z.array(z.object({
        value: z.string(),
        type: z.optional(z.union([z.string(), z.null()])),
        primary: z.boolean(),
    }))),
    phones: z.optional(z.array(z.object({
        value: z.string(),
        type: z.optional(z.union([z.string(), z.null()])),
        primary: z.boolean(),
    }))),
    addresses: z.optional(z.array(z.object({
        street: z.optional(z.union([z.string(), z.null()])),
        houseNumber: z.optional(z.union([z.string(), z.null()])),
        addressSuffix: z.optional(z.union([z.string(), z.null()])),
        zip: z.optional(z.union([z.string(), z.null()])),
        city: z.optional(z.union([z.string(), z.null()])),
        state: z.optional(z.union([z.string(), z.null()])),
        country: z.optional(z.union([z.string(), z.null()])),
        type: z.optional(z.union([z.string(), z.null()])),
        primary: z.boolean(),
    }))),
    relationIds: z.optional(z.union([z.array(z.object({
        targetContactId: z.string(),
        relationType: z.string(),
    })), z.null()])),
    tagNames: z.optional(z.union([z.array(z.string()), z.null()])),
});

export const ContactUpdateSchema = z.object({
    id: z.string(),
    data: z.object({
        contact: z.optional(z.union([z.object({
            displayName: z.string().check(z.minLength(1, 'Display name is required')),
            givenName: z.optional(z.union([z.string(), z.null()])),
            familyName: z.optional(z.union([z.string(), z.null()])),
            middleName: z.optional(z.union([z.string(), z.null()])),
            honorificPrefix: z.optional(z.union([z.string(), z.null()])),
            honorificSuffix: z.optional(z.union([z.string(), z.null()])),
            birthday: z.optional(z.union([z.string(), z.null()])),
            gender: z.optional(z.union([z.string(), z.null()])),
            notes: z.optional(z.union([z.string(), z.null()])),
            isPublic: z.optional(z.union([z.boolean(), z.string(), z.null()])),
        }), z.null()])),
        emails: z.optional(z.union([z.array(z.object({
            value: z.string(),
            type: z.optional(z.union([z.string(), z.null()])),
            primary: z.boolean(),
        })), z.null()])),
        phones: z.optional(z.union([z.array(z.object({
            value: z.string(),
            type: z.optional(z.union([z.string(), z.null()])),
            primary: z.boolean(),
        })), z.null()])),
        addresses: z.optional(z.union([z.array(z.object({
            street: z.optional(z.union([z.string(), z.null()])),
            houseNumber: z.optional(z.union([z.string(), z.null()])),
            addressSuffix: z.optional(z.union([z.string(), z.null()])),
            zip: z.optional(z.union([z.string(), z.null()])),
            city: z.optional(z.union([z.string(), z.null()])),
            state: z.optional(z.union([z.string(), z.null()])),
            country: z.optional(z.union([z.string(), z.null()])),
            type: z.optional(z.union([z.string(), z.null()])),
            primary: z.boolean(),
        })), z.null()])),
        relationIds: z.optional(z.union([z.array(z.object({
            targetContactId: z.string(),
            relationType: z.string(),
        })), z.null()])),
        tagNames: z.optional(z.union([z.array(z.string()), z.null()])),
    }),
});

export const AssociationSchema = z.object({
    type: z.string(),
    entityId: z.string(),
    contactId: z.string(),
});

export const UpdateAssociationSchema = z.object({
    type: z.literal('event'),
    entityId: z.string(),
    contactId: z.string(),
    status: z.string(),
});

export const GetAssociationsSchema = z.object({
    type: z.string(),
    entityId: z.string(),
});


