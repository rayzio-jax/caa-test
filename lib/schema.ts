import { integer, pgEnum, pgTable, timestamp, uuid } from "drizzle-orm/pg-core";

export const statusEnum = pgEnum("status", ["QUEUE", "HANDLED", "RESOLVED"]);

export const roomsTable = pgTable("rooms", {
    id: uuid().primaryKey().defaultRandom(),
    room_id: integer().notNull(),
    channel_id: integer().notNull(),
    agent_id: integer(),
    status: statusEnum("status").notNull().default("QUEUE"),
    created_at: timestamp().notNull().defaultNow(),
    updated_at: timestamp().notNull().defaultNow(),
});
