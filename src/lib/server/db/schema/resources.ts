import { pgTable, text, timestamp, doublePrecision, primaryKey, index, jsonb, integer, uuid } from "drizzle-orm/pg-core";
import { relations } from 'drizzle-orm';
import { user } from "./auth";
import { event } from "./events";

/**
 * Locations table
 * Stores physical locations where resources can be found or events can take place.
 */
export const location = pgTable("location", {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
        .notNull()
        .references(() => user.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    street: text("street"),
    houseNumber: text("house_number"),
    addressSuffix: text("address_suffix"), // Adresszusatz
    zip: text("zip"),
    city: text("city"),
    state: text("state"),
    country: text("country"),
    roomId: text("room_id"), // Specific room identifier (e.g., "Conference Room A")
    latitude: doublePrecision("latitude"),
    longitude: doublePrecision("longitude"),
    what3words: text("what3words"), // e.g., "filled.count.soap"
    inclusivitySupport: text("inclusivity_support"), // Accessibility and inclusivity information
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
        .defaultNow()
        .$onUpdate(() => new Date())
        .notNull(),
}, (table) => [
    index("location_user_id_idx").on(table.userId),
]);

/**
 * Resources table
 * Stores bookable items like rooms, equipment, etc.
 */
export const resource = pgTable("resource", {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
        .notNull()
        .references(() => user.id, { onDelete: "cascade" }),
    locationId: uuid("location_id")
        .references(() => location.id, { onDelete: "set null" }),
    name: text("name").notNull(),
    description: text("description"),
    type: text("type").notNull(), // e.g., "room", "equipment", "vehicle"
    allocationCalendars: jsonb("allocation_calendars").$type<Array<{ provider: string; calendarId: string }>>(), // Track allocation via synced calendars
    maxOccupancy: integer("max_occupancy"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
        .defaultNow()
        .$onUpdate(() => new Date())
        .notNull(),
}, (table) => [
    index("resource_user_id_idx").on(table.userId),
    index("resource_location_id_idx").on(table.locationId),
]);

/**
 * Resource Relations table (Many-to-Many Hierarchy)
 * Allows resources to be composed of other resources (e.g., a room contains a projector).
 * A resource can be a child of multiple parents (shared resource).
 */
export const resourceRelation = pgTable("resource_relation", {
    parentResourceId: uuid("parent_resource_id")
        .notNull()
        .references(() => resource.id, { onDelete: "cascade" }),
    childResourceId: uuid("child_resource_id")
        .notNull()
        .references(() => resource.id, { onDelete: "cascade" }),
}, (table) => [
    primaryKey({ columns: [table.parentResourceId, table.childResourceId] }),
    index("resource_relation_parent_idx").on(table.parentResourceId),
    index("resource_relation_child_idx").on(table.childResourceId),
]);

/**
 * Event Resources table (Many-to-Many)
 * Associates resources with events.
 */
export const eventResource = pgTable("event_resource", {
    eventId: uuid("event_id")
        .notNull()
        .references(() => event.id, { onDelete: "cascade" }),
    resourceId: uuid("resource_id")
        .notNull()
        .references(() => resource.id, { onDelete: "cascade" }),
}, (table) => [
    primaryKey({ columns: [table.eventId, table.resourceId] }),
    index("event_resource_event_idx").on(table.eventId),
    index("event_resource_resource_idx").on(table.resourceId),
]);

import { eventLocation } from "./events";
import { announcementLocation } from "./announcements";
import { kioskLocation } from "./kiosks";

export const locationRelations = relations(location, ({ many }) => ({
    resources: many(resource),
    eventLocations: many(eventLocation),
    announcementLocations: many(announcementLocation),
    kioskLocations: many(kioskLocation),
}));

export const resourceRelations = relations(resource, ({ one, many }) => ({
    location: one(location, {
        fields: [resource.locationId],
        references: [location.id],
    }),
    eventResources: many(eventResource),
    childRelations: many(resourceRelation, { relationName: 'parentResource' }),
    parentRelations: many(resourceRelation, { relationName: 'childResource' }),
}));

export const resourceRelationRelations = relations(resourceRelation, ({ one }) => ({
    parentResource: one(resource, {
        fields: [resourceRelation.parentResourceId],
        references: [resource.id],
        relationName: 'parentResource',
    }),
    childResource: one(resource, {
        fields: [resourceRelation.childResourceId],
        references: [resource.id],
        relationName: 'childResource',
    }),
}));

export const eventResourceRelations = relations(eventResource, ({ one }) => ({
    event: one(event, {
        fields: [eventResource.eventId],
        references: [event.id],
    }),
    resource: one(resource, {
        fields: [eventResource.resourceId],
        references: [resource.id],
    }),
}));
