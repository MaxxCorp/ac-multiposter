import { pgTable, text, timestamp, boolean, index, primaryKey } from "drizzle-orm/pg-core";
import { user } from "./auth-schema";
import { location, resource } from "./resources-schema";
import { event } from "./events-schema";

/**
 * Contacts table based on Google People API Person resource
 */
export const contact = pgTable("contact", {
    id: text("id").primaryKey(),
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

/**
 * Contact Email Addresses
 */
export const contactEmail = pgTable("contact_email", {
    id: text("id").primaryKey(),
    contactId: text("contact_id")
        .notNull()
        .references(() => contact.id, { onDelete: "cascade" }),
    value: text("value").notNull(),
    type: text("type"), // e.g., 'home', 'work', 'other'
    primary: boolean("primary").default(false).notNull(),
}, (table) => [
    index("contact_email_contact_id_idx").on(table.contactId),
]);

/**
 * Contact Phone Numbers
 */
export const contactPhone = pgTable("contact_phone", {
    id: text("id").primaryKey(),
    contactId: text("contact_id")
        .notNull()
        .references(() => contact.id, { onDelete: "cascade" }),
    value: text("value").notNull(),
    type: text("type"), // e.g., 'home', 'work', 'mobile', 'workMobile', 'other'
    primary: boolean("primary").default(false).notNull(),
}, (table) => [
    index("contact_phone_contact_id_idx").on(table.contactId),
]);

/**
 * Contact Physical Addresses
 */
export const contactAddress = pgTable("contact_address", {
    id: text("id").primaryKey(),
    contactId: text("contact_id")
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

/**
 * Many-to-Many associations
 */

export const userContact = pgTable("user_contact", {
    userId: text("user_id")
        .notNull()
        .references(() => user.id, { onDelete: "cascade" }),
    contactId: text("contact_id")
        .notNull()
        .references(() => contact.id, { onDelete: "cascade" }),
}, (table) => [
    primaryKey({ columns: [table.userId, table.contactId] }),
    index("user_contact_user_idx").on(table.userId),
    index("user_contact_contact_idx").on(table.contactId),
]);

export const locationContact = pgTable("location_contact", {
    locationId: text("location_id")
        .notNull()
        .references(() => location.id, { onDelete: "cascade" }),
    contactId: text("contact_id")
        .notNull()
        .references(() => contact.id, { onDelete: "cascade" }),
}, (table) => [
    primaryKey({ columns: [table.locationId, table.contactId] }),
    index("location_contact_location_idx").on(table.locationId),
    index("location_contact_contact_idx").on(table.contactId),
]);

export const resourceContact = pgTable("resource_contact", {
    resourceId: text("resource_id")
        .notNull()
        .references(() => resource.id, { onDelete: "cascade" }),
    contactId: text("contact_id")
        .notNull()
        .references(() => contact.id, { onDelete: "cascade" }),
}, (table) => [
    primaryKey({ columns: [table.resourceId, table.contactId] }),
    index("resource_contact_resource_idx").on(table.resourceId),
    index("resource_contact_contact_idx").on(table.contactId),
]);

export const eventContact = pgTable("event_contact", {
    eventId: text("event_id")
        .notNull()
        .references(() => event.id, { onDelete: "cascade" }),
    contactId: text("contact_id")
        .notNull()
        .references(() => contact.id, { onDelete: "cascade" }),
    participationStatus: text("participation_status").default("needsAction").notNull(), // accepted, declined, tentative, needsAction
}, (table) => [
    primaryKey({ columns: [table.eventId, table.contactId] }),
    index("event_contact_event_idx").on(table.eventId),
    index("event_contact_contact_idx").on(table.contactId),
]);

/**
 * Contact Relations (Self-referential many-to-many)
 */
export const contactRelation = pgTable("contact_relation", {
    id: text("id").primaryKey(),
    contactId: text("contact_id")
        .notNull()
        .references(() => contact.id, { onDelete: "cascade" }),
    targetContactId: text("target_contact_id")
        .notNull()
        .references(() => contact.id, { onDelete: "cascade" }),
    relationType: text("relation_type").notNull(), // e.g., 'reports to', 'cooperates with'
    createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
    index("contact_relation_contact_idx").on(table.contactId),
    index("contact_relation_target_idx").on(table.targetContactId),
]);

/**
 * Global Tags Table
 */
export const tag = pgTable("tag", {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    userId: text("user_id")
        .notNull()
        .references(() => user.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
    index("tag_user_idx").on(table.userId),
    index("tag_name_user_idx").on(table.userId, table.name),
]);

/**
 * Contact-Tag Join Table
 */
export const contactTag = pgTable("contact_tag", {
    contactId: text("contact_id")
        .notNull()
        .references(() => contact.id, { onDelete: "cascade" }),
    tagId: text("tag_id")
        .notNull()
        .references(() => tag.id, { onDelete: "cascade" }),
}, (table) => [
    primaryKey({ columns: [table.contactId, table.tagId] }),
    index("contact_tag_contact_idx").on(table.contactId),
    index("contact_tag_tag_idx").on(table.tagId),
]);

export type Contact = typeof contact.$inferSelect;
export type NewContact = typeof contact.$inferInsert;
export type ContactEmail = typeof contactEmail.$inferSelect;
export type NewContactEmail = typeof contactEmail.$inferInsert;
export type ContactPhone = typeof contactPhone.$inferSelect;
export type NewContactPhone = typeof contactPhone.$inferInsert;
export type ContactAddress = typeof contactAddress.$inferSelect;
export type NewContactAddress = typeof contactAddress.$inferInsert;
export type ContactRelation = typeof contactRelation.$inferSelect;
export type NewContactRelation = typeof contactRelation.$inferInsert;
export type Tag = typeof tag.$inferSelect;
export type NewTag = typeof tag.$inferInsert;

import { relations } from 'drizzle-orm';

export const contactRelations = relations(contact, ({ many }) => ({
    emails: many(contactEmail),
    phones: many(contactPhone),
    addresses: many(contactAddress),
    userAssociations: many(userContact),
    locationAssociations: many(locationContact),
    resourceAssociations: many(resourceContact),
    eventAssociations: many(eventContact),
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
}));

export const resourceContactRelations = relations(resourceContact, ({ one }) => ({
    contact: one(contact, {
        fields: [resourceContact.contactId],
        references: [contact.id],
    }),
}));

export const eventContactRelations = relations(eventContact, ({ one }) => ({
    contact: one(contact, {
        fields: [eventContact.contactId],
        references: [contact.id],
    }),
}));
