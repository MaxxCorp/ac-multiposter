import { pgTable, text, timestamp, doublePrecision, primaryKey, index, jsonb } from "drizzle-orm/pg-core";
import { user } from "./auth-schema";
import { event } from "./events-schema";

/**
 * Locations table
 * Stores physical locations where resources can be found or events can take place.
 */
export const location = pgTable("location", {
    id: text("id").primaryKey(),
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
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
        .defaultNow()
        .$onUpdate(() => new Date())
        .notNull(),
}, (table) => ({
    locationUserIndex: index("location_user_id_idx").on(table.userId),
}));

/**
 * Resources table
 * Stores bookable items like rooms, equipment, etc.
 */
export const resource = pgTable("resource", {
    id: text("id").primaryKey(),
    userId: text("user_id")
        .notNull()
        .references(() => user.id, { onDelete: "cascade" }),
    locationId: text("location_id")
        .references(() => location.id, { onDelete: "set null" }),
    name: text("name").notNull(),
    description: text("description"),
    type: text("type").notNull(), // e.g., "room", "equipment", "vehicle"
    allocationCalendars: jsonb("allocation_calendars").$type<Array<{ provider: string; calendarId: string }>>(), // Track allocation via synced calendars
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
        .defaultNow()
        .$onUpdate(() => new Date())
        .notNull(),
}, (table) => ({
    resourceUserIndex: index("resource_user_id_idx").on(table.userId),
    resourceLocationIndex: index("resource_location_id_idx").on(table.locationId),
}));

/**
 * Resource Relations table (Many-to-Many Hierarchy)
 * Allows resources to be composed of other resources (e.g., a room contains a projector).
 * A resource can be a child of multiple parents (shared resource).
 */
export const resourceRelation = pgTable("resource_relation", {
    parentResourceId: text("parent_resource_id")
        .notNull()
        .references(() => resource.id, { onDelete: "cascade" }),
    childResourceId: text("child_resource_id")
        .notNull()
        .references(() => resource.id, { onDelete: "cascade" }),
}, (table) => ({
    pk: primaryKey({ columns: [table.parentResourceId, table.childResourceId] }),
    parentIndex: index("resource_relation_parent_idx").on(table.parentResourceId),
    childIndex: index("resource_relation_child_idx").on(table.childResourceId),
}));

/**
 * Event Resources table (Many-to-Many)
 * Associates resources with events.
 */
export const eventResource = pgTable("event_resource", {
    eventId: text("event_id")
        .notNull()
        .references(() => event.id, { onDelete: "cascade" }),
    resourceId: text("resource_id")
        .notNull()
        .references(() => resource.id, { onDelete: "cascade" }),
}, (table) => ({
    pk: primaryKey({ columns: [table.eventId, table.resourceId] }),
    eventIndex: index("event_resource_event_idx").on(table.eventId),
    resourceIndex: index("event_resource_resource_idx").on(table.resourceId),
}));
