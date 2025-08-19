import { pgEnum, pgTable, timestamp, uuid, varchar } from "drizzle-orm/pg-core";

export const statusEnum = pgEnum("status", ["QUEUE", "HANDLED", "RESOLVED"]);

export const roomsTable = pgTable("rooms", {
    id: uuid().primaryKey().defaultRandom(),
    room_id: varchar({ length: 255 }).notNull(),
    channel_id: varchar({ length: 255 }).notNull(),
    agent_id: varchar({ length: 255 }),
    status: statusEnum("status").notNull().default("QUEUE"),
    created_at: timestamp().notNull().defaultNow(),
    updated_at: timestamp().notNull().defaultNow(),
});
