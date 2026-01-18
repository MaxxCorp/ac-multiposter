import { pgTable, text, timestamp, boolean, index, primaryKey, uuid } from "drizzle-orm/pg-core";
import { relations } from 'drizzle-orm';
import { user } from "./auth";
import { location, resource } from "./resources";
import { event } from "./events";
import { announcementContact, announcementTag } from "./announcements";

export const contact = pgTable("contact", {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
        .notNull()
        .references(() => user.id, { onDelete: "cascade" }),

    // Name fields
    displayName: text("display_name"),
    givenName: text("given_name"),
    familyName: text("family_name"),
    middleName: text("middle_name"),
    honorificPrefix: text("honorific_prefix"),
    honorificSuffix: text("honorific_suffix"),

    // Metadata
    birthday: timestamp("birthday"),
    gender: text("gender"),
    notes: text("notes"),
    isPublic: boolean("is_public").default(false).notNull(),
    vCardPath: text("vcard_path"),
    qrCodePath: text("qrcode_path"),

    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
        .defaultNow()
        .$onUpdate(() => new Date())
        .notNull(),
}, (table) => [
    index("contact_user_id_idx").on(table.userId),
]);

export const contactEmail = pgTable("contact_email", {
    id: uuid("id").primaryKey().defaultRandom(),
    contactId: uuid("contact_id")
        .notNull()
        .references(() => contact.id, { onDelete: "cascade" }),
    value: text("value").notNull(),
    type: text("type"), // e.g., 'home', 'work', 'other'
    primary: boolean("primary").default(false).notNull(),
}, (table) => [
    index("contact_email_contact_id_idx").on(table.contactId),
]);

export const contactPhone = pgTable("contact_phone", {
    id: uuid("id").primaryKey().defaultRandom(),
    contactId: uuid("contact_id")
        .notNull()
        .references(() => contact.id, { onDelete: "cascade" }),
    value: text("value").notNull(),
    type: text("type"), // e.g., 'home', 'work', 'mobile', 'workMobile', 'other'
    primary: boolean("primary").default(false).notNull(),
}, (table) => [
    index("contact_phone_contact_id_idx").on(table.contactId),
]);

export const contactAddress = pgTable("contact_address", {
    id: uuid("id").primaryKey().defaultRandom(),
    contactId: uuid("contact_id")
        .notNull()
        .references(() => contact.id, { onDelete: "cascade" }),
    street: text("street"),
    houseNumber: text("house_number"),
    addressSuffix: text("address_suffix"),
    zip: text("zip"),
    city: text("city"),
    state: text("state"),
    country: text("country"),
    type: text("type"), // e.g., 'home', 'work', 'other'
    primary: boolean("primary").default(false).notNull(),
}, (table) => [
    index("contact_address_contact_id_idx").on(table.contactId),
]);

export const userContact = pgTable("user_contact", {
    userId: text("user_id")
        .notNull()
        .references(() => user.id, { onDelete: "cascade" }),
    contactId: uuid("contact_id")
        .notNull()
        .references(() => contact.id, { onDelete: "cascade" }),
}, (table) => [
    primaryKey({ columns: [table.userId, table.contactId] }),
    index("user_contact_user_idx").on(table.userId),
    index("user_contact_contact_idx").on(table.contactId),
]);

export const locationContact = pgTable("location_contact", {
    locationId: uuid("location_id")
        .notNull()
        .references(() => location.id, { onDelete: "cascade" }),
    contactId: uuid("contact_id")
        .notNull()
        .references(() => contact.id, { onDelete: "cascade" }),
}, (table) => [
    primaryKey({ columns: [table.locationId, table.contactId] }),
    index("location_contact_location_idx").on(table.locationId),
    index("location_contact_contact_idx").on(table.contactId),
]);

export const resourceContact = pgTable("resource_contact", {
    resourceId: uuid("resource_id")
        .notNull()
        .references(() => resource.id, { onDelete: "cascade" }),
    contactId: uuid("contact_id")
        .notNull()
        .references(() => contact.id, { onDelete: "cascade" }),
}, (table) => [
    primaryKey({ columns: [table.resourceId, table.contactId] }),
    index("resource_contact_resource_idx").on(table.resourceId),
    index("resource_contact_contact_idx").on(table.contactId),
]);

export const eventContact = pgTable("event_contact", {
    eventId: uuid("event_id")
        .notNull()
        .references(() => event.id, { onDelete: "cascade" }),
    contactId: uuid("contact_id")
        .notNull()
        .references(() => contact.id, { onDelete: "cascade" }),
    participationStatus: text("participation_status").default("needsAction").notNull(), // accepted, declined, tentative, needsAction
}, (table) => [
    primaryKey({ columns: [table.eventId, table.contactId] }),
    index("event_contact_event_idx").on(table.eventId),
    index("event_contact_contact_idx").on(table.contactId),
]);

export const contactRelation = pgTable("contact_relation", {
    id: uuid("id").primaryKey().defaultRandom(),
    contactId: uuid("contact_id")
        .notNull()
        .references(() => contact.id, { onDelete: "cascade" }),
    targetContactId: uuid("target_contact_id")
        .notNull()
        .references(() => contact.id, { onDelete: "cascade" }),
    relationType: text("relation_type").notNull(), // e.g., 'reports to', 'cooperates with'
    createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
    index("contact_relation_contact_idx").on(table.contactId),
    index("contact_relation_target_idx").on(table.targetContactId),
]);

export const tag = pgTable("tag", {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    userId: text("user_id")
        .notNull()
        .references(() => user.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
    index("tag_user_idx").on(table.userId),
    index("tag_name_user_idx").on(table.userId, table.name),
]);

export const contactTag = pgTable("contact_tag", {
    contactId: uuid("contact_id")
        .notNull()
        .references(() => contact.id, { onDelete: "cascade" }),
    tagId: uuid("tag_id")
        .notNull()
        .references(() => tag.id, { onDelete: "cascade" }),
}, (table) => [
    primaryKey({ columns: [table.contactId, table.tagId] }),
    index("contact_tag_contact_idx").on(table.contactId),
    index("contact_tag_tag_idx").on(table.tagId),
]);

export const contactRelations = relations(contact, ({ many }) => ({
    emails: many(contactEmail),
    phones: many(contactPhone),
    addresses: many(contactAddress),
    userAssociations: many(userContact),
    locationAssociations: many(locationContact),
    resourceAssociations: many(resourceContact),
    events: many(eventContact),
    announcements: many(announcementContact),
    relations: many(contactRelation, { relationName: 'fromRelations' }),
    relatedTo: many(contactRelation, { relationName: 'toRelations' }),
    tags: many(contactTag),
}));

export const contactRelationRelations = relations(contactRelation, ({ one }) => ({
    contact: one(contact, {
        fields: [contactRelation.contactId],
        references: [contact.id],
        relationName: 'fromRelations',
    }),
    targetContact: one(contact, {
        fields: [contactRelation.targetContactId],
        references: [contact.id],
        relationName: 'toRelations',
    }),
}));

export const tagRelations = relations(tag, ({ many }) => ({
    contactAssociations: many(contactTag),
    announcementAssociations: many(announcementTag),
}));

export const contactTagRelations = relations(contactTag, ({ one }) => ({
    contact: one(contact, {
        fields: [contactTag.contactId],
        references: [contact.id],
    }),
    tag: one(tag, {
        fields: [contactTag.tagId],
        references: [tag.id],
    }),
}));

export const contactEmailRelations = relations(contactEmail, ({ one }) => ({
    contact: one(contact, {
        fields: [contactEmail.contactId],
        references: [contact.id],
    }),
}));

export const contactPhoneRelations = relations(contactPhone, ({ one }) => ({
    contact: one(contact, {
        fields: [contactPhone.contactId],
        references: [contact.id],
    }),
}));

export const contactAddressRelations = relations(contactAddress, ({ one }) => ({
    contact: one(contact, {
        fields: [contactAddress.contactId],
        references: [contact.id],
    }),
}));

export const userContactRelations = relations(userContact, ({ one }) => ({
    contact: one(contact, {
        fields: [userContact.contactId],
        references: [contact.id],
    }),
    user: one(user, {
        fields: [userContact.userId],
        references: [user.id],
    }),
}));

export const locationContactRelations = relations(locationContact, ({ one }) => ({
    contact: one(contact, {
        fields: [locationContact.contactId],
        references: [contact.id],
    }),
    location: one(location, {
        fields: [locationContact.locationId],
        references: [location.id]
    }),
}));

export const resourceContactRelations = relations(resourceContact, ({ one }) => ({
    contact: one(contact, {
        fields: [resourceContact.contactId],
        references: [contact.id],
    }),
    resource: one(resource, {
        fields: [resourceContact.resourceId],
        references: [resource.id]
    }),
}));

export const eventContactRelations = relations(eventContact, ({ one }) => ({
    contact: one(contact, {
        fields: [eventContact.contactId],
        references: [contact.id],
    }),
    event: one(event, {
        fields: [eventContact.eventId],
        references: [event.id],
    }),
}));
