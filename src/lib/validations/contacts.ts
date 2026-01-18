import * as v from 'valibot';

// Minimal pure Valibot schemas for contact sub-entities
const contactBaseSchema = v.object({
    displayName: v.pipe(v.string(), v.minLength(1, 'Display name is required')),
    givenName: v.optional(v.string()),
    familyName: v.optional(v.string()),
    honorificPrefix: v.optional(v.string()),
    honorificSuffix: v.optional(v.string()),
    birthday: v.optional(v.string()),
    notes: v.optional(v.string()),
    isPublic: v.optional(v.union([v.boolean(), v.string()])), // FormData doesn't have null
});

const emailSchemaPure = v.object({
    id: v.optional(v.pipe(v.string(), v.uuid())),
    value: v.union([v.pipe(v.string(), v.email()), v.pipe(v.string(), v.length(0))]),
    type: v.fallback(v.string(), 'work'),
    primary: v.fallback(v.boolean(), false),
});

const phoneSchemaPure = v.object({
    id: v.optional(v.pipe(v.string(), v.uuid())),
    value: v.string(),
    type: v.fallback(v.string(), 'mobile'),
    primary: v.fallback(v.boolean(), false),
});

const addressSchemaPure = v.object({
    id: v.optional(v.pipe(v.string(), v.uuid())),
    street: v.optional(v.string()),
    houseNumber: v.optional(v.string()),
    zip: v.optional(v.string()),
    city: v.optional(v.string()),
    state: v.optional(v.string()),
    country: v.optional(v.string()),
    type: v.fallback(v.string(), 'home'),
    primary: v.fallback(v.boolean(), false),
});

const contactRelationSchemaPure = v.object({
    id: v.optional(v.pipe(v.string(), v.uuid())),
    targetContactId: v.pipe(v.string(), v.uuid()),
    relationType: v.fallback(v.string(), 'cooperates with'),
    targetContact: v.optional(v.any()), // For UI display
});

const tagSchemaPure = v.object({
    id: v.optional(v.pipe(v.string(), v.uuid())),
    name: v.string(),
});

export const contactSchema = v.intersect([
    contactBaseSchema,
    v.object({
        id: v.optional(v.pipe(v.string(), v.uuid())),
        emails: v.optional(v.array(emailSchemaPure)),
        phones: v.optional(v.array(phoneSchemaPure)),
        addresses: v.optional(v.array(addressSchemaPure)),
        relations: v.optional(v.array(contactRelationSchemaPure)),
        tags: v.optional(v.array(tagSchemaPure)),
        participationStatus: v.optional(v.string()),
    })
]);

export type Contact = v.InferOutput<typeof contactSchema>;

export const createContactSchema = v.object({
    contact: contactBaseSchema,
    emails: v.optional(v.array(v.omit(emailSchemaPure, ['id']))),
    phones: v.optional(v.array(v.omit(phoneSchemaPure, ['id']))),
    addresses: v.optional(v.array(v.omit(addressSchemaPure, ['id']))),

    relationIds: v.optional(v.array(v.object({
        targetContactId: v.pipe(v.string(), v.uuid()),
        relationType: v.string(),
    }))),
    tagNames: v.optional(v.array(v.string())),

    // Serialized JSON fields for FormData transport
    emailsJson: v.optional(v.string()),
    phonesJson: v.optional(v.string()),
    addressesJson: v.optional(v.string()),
    relationsJson: v.optional(v.string()),
    tagsJson: v.optional(v.string()),
});

export const updateContactSchema = v.object({
    id: v.pipe(v.string(), v.uuid()),
    data: v.object({
        contact: v.optional(v.partial(contactBaseSchema)),
        emails: v.optional(v.array(v.omit(emailSchemaPure, ['id']))),
        phones: v.optional(v.array(v.omit(phoneSchemaPure, ['id']))),
        addresses: v.optional(v.array(v.omit(addressSchemaPure, ['id']))),

        relationIds: v.optional(v.array(v.object({
            targetContactId: v.pipe(v.string(), v.uuid()),
            relationType: v.string(),
        }))),
        tagNames: v.optional(v.array(v.string())),
    }),
    emailsJson: v.optional(v.string()),
    phonesJson: v.optional(v.string()),
    addressesJson: v.optional(v.string()),
    relationsJson: v.optional(v.string()),
    tagsJson: v.optional(v.string()),
});

export const associationSchema = v.object({
    type: v.picklist(['event', 'user', 'location', 'resource', 'announcement']),
    entityId: v.string(),
    contactId: v.pipe(v.string(), v.uuid()),
});

export const updateAssociationSchema = v.object({
    type: v.literal('event'),
    entityId: v.string(),
    contactId: v.pipe(v.string(), v.uuid()),
    status: v.string(),
});

export const getAssociationsSchema = v.object({
    type: v.picklist(['event', 'user', 'location', 'resource', 'announcement']),
    entityId: v.string(),
});
