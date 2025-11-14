import { pgTable, text, timestamp, boolean, jsonb, integer, index } from "drizzle-orm/pg-core";
import { user } from "./schema";

/**
 * Events table supporting Google Calendar API v3 event model
 * Based on: https://developers.google.com/calendar/api/v3/reference/events
 */
export const event = pgTable("event", {
  // Core identification
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  
  // Google Calendar sync fields
  googleEventId: text("google_event_id"),
  googleCalendarId: text("google_calendar_id"),
  iCalUID: text("ical_uid"), // RFC5545 unique identifier
  etag: text("etag"),
  htmlLink: text("html_link"),
  
  // Basic event information
  summary: text("summary").notNull(), // Title of the event
  description: text("description"),
  location: text("location"),
  colorId: text("color_id"),
  
  // Event type and status
  eventType: text("event_type").default("default").notNull(), // default, birthday, focusTime, outOfOffice, workingLocation, fromGmail
  status: text("status").default("confirmed").notNull(), // confirmed, tentative, cancelled
  
  // Time information
  startDate: text("start_date"), // For all-day events: "yyyy-mm-dd"
  startDateTime: timestamp("start_date_time"), // For timed events
  startTimeZone: text("start_time_zone"), // IANA timezone name
  
  endDate: text("end_date"), // For all-day events: "yyyy-mm-dd"
  endDateTime: timestamp("end_date_time"), // For timed events
  endTimeZone: text("end_time_zone"), // IANA timezone name
  endTimeUnspecified: boolean("end_time_unspecified").default(false),
  
  // Recurrence
  recurrence: jsonb("recurrence").$type<string[]>(), // Array of RRULE, EXRULE, RDATE, EXDATE
  recurringEventId: text("recurring_event_id"), // ID of the recurring event if this is an instance
  originalStartTime: jsonb("original_start_time").$type<{
    date?: string;
    dateTime?: string;
    timeZone?: string;
  }>(), // For recurring event instances
  
  // Visibility and transparency
  visibility: text("visibility").default("default"), // default, public, private, confidential
  transparency: text("transparency").default("opaque"), // opaque (busy), transparent (available)
  
  // Organizer and creator
  creator: jsonb("creator").$type<{
    id?: string;
    email?: string;
    displayName?: string;
    self?: boolean;
  }>(),
  organizer: jsonb("organizer").$type<{
    id?: string;
    email?: string;
    displayName?: string;
    self?: boolean;
  }>(),
  
  // Attendees
  attendees: jsonb("attendees").$type<Array<{
    id?: string;
    email: string;
    displayName?: string;
    organizer?: boolean;
    self?: boolean;
    resource?: boolean;
    optional?: boolean;
    responseStatus?: string; // needsAction, declined, tentative, accepted
    comment?: string;
    additionalGuests?: number;
  }>>(),
  attendeesOmitted: boolean("attendees_omitted").default(false),
  
  // Guest permissions
  guestsCanInviteOthers: boolean("guests_can_invite_others").default(true),
  guestsCanModify: boolean("guests_can_modify").default(false),
  guestsCanSeeOtherGuests: boolean("guests_can_see_other_guests").default(true),
  anyoneCanAddSelf: boolean("anyone_can_add_self").default(false),
  
  // Reminders
  reminders: jsonb("reminders").$type<{
    useDefault: boolean;
    overrides?: Array<{
      method: string; // email, popup
      minutes: number; // 0-40320 (4 weeks)
    }>;
  }>(),
  
  // Conference data (Google Meet, etc.)
  conferenceData: jsonb("conference_data").$type<{
    createRequest?: {
      requestId: string;
      conferenceSolutionKey: { type: string };
      status?: { statusCode: string };
    };
    entryPoints?: Array<{
      entryPointType: string; // video, phone, sip, more
      uri: string;
      label?: string;
      pin?: string;
      accessCode?: string;
      meetingCode?: string;
      passcode?: string;
      password?: string;
    }>;
    conferenceSolution?: {
      key: { type: string };
      name: string;
      iconUri?: string;
    };
    conferenceId?: string;
    signature?: string;
    notes?: string;
  }>(),
  hangoutLink: text("hangout_link"),
  
  // Attachments
  attachments: jsonb("attachments").$type<Array<{
    fileUrl: string;
    title?: string;
    mimeType?: string;
    iconLink?: string;
    fileId?: string;
  }>>(),
  
  // Extended properties (custom metadata)
  extendedProperties: jsonb("extended_properties").$type<{
    private?: Record<string, string>;
    shared?: Record<string, string>;
  }>(),
  
  // Working location properties (for eventType: workingLocation)
  workingLocationProperties: jsonb("working_location_properties").$type<{
    type?: string; // homeOffice, officeLocation, customLocation
    homeOffice?: any;
    customLocation?: {
      label: string;
    };
    officeLocation?: {
      buildingId?: string;
      floorId?: string;
      floorSectionId?: string;
      deskId?: string;
      label?: string;
    };
  }>(),
  
  // Out of office properties (for eventType: outOfOffice)
  outOfOfficeProperties: jsonb("out_of_office_properties").$type<{
    autoDeclineMode?: string; // declineNone, declineAllConflictingInvitations, declineOnlyNewConflictingInvitations
    declineMessage?: string;
  }>(),
  
  // Focus time properties (for eventType: focusTime)
  focusTimeProperties: jsonb("focus_time_properties").$type<{
    autoDeclineMode?: string;
    declineMessage?: string;
    chatStatus?: string; // available, doNotDisturb
  }>(),
  
  // Birthday properties (for eventType: birthday)
  birthdayProperties: jsonb("birthday_properties").$type<{
    contact?: string;
    type?: string; // anniversary, birthday, custom, other, self
    customTypeName?: string;
  }>(),
  
  // Source (external references)
  source: jsonb("source").$type<{
    url?: string;
    title?: string;
  }>(),
  
  // Additional flags
  locked: boolean("locked").default(false),
  privateCopy: boolean("private_copy").default(false),
  sequence: integer("sequence").default(0),
  
  // Timestamps
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
}, (table) => ({
  eventUserIndex: index("event_user_id_idx").on(table.userId),
}));

export type Event = typeof event.$inferSelect;
export type NewEvent = typeof event.$inferInsert;
