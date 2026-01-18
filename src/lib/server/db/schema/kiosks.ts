import { pgTable, text, timestamp, integer, uuid, index } from "drizzle-orm/pg-core";
import { relations } from 'drizzle-orm';
import { user } from "./auth";
import { location } from "./resources";

export const kiosk = pgTable("kiosk", {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
        .notNull()
        .references(() => user.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description"),
    locationId: uuid("location_id")
        .notNull()
        .references(() => location.id, { onDelete: "cascade" }),
    // Display Settings
    loopDuration: integer("loop_duration").default(5).notNull(), // Seconds per slide
    lookAhead: integer("look_ahead").default(2419200).notNull(), // Seconds (4 weeks default)
    lookPast: integer("look_past").default(0).notNull(), // Seconds (0 default)

    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
        .defaultNow()
        .$onUpdate(() => /* @__PURE__ */ new Date())
        .notNull(),
}, (table) => [
    index("kiosk_user_id_idx").on(table.userId),
    index("kiosk_location_id_idx").on(table.locationId),
]);

export const kioskRelations = relations(kiosk, ({ one }) => ({
    user: one(user, {
        fields: [kiosk.userId],
        references: [user.id],
    }),
    location: one(location, {
        fields: [kiosk.locationId],
        references: [location.id],
    }),
}));

export type Kiosk = typeof kiosk.$inferSelect;
export type CreateKioskInput = typeof kiosk.$inferInsert;
