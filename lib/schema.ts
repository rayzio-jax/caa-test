import { integer, pgEnum, pgTable, timestamp } from "drizzle-orm/pg-core";

export const statusEnum = pgEnum("status", ["QUEUE", "HANDLED", "RESOLVED"]);

export const TbRooms = pgTable("rooms", {
    id: integer().primaryKey().default(0),
    channelId: integer("channel_id").notNull(),
    agentId: integer("agent_id"),
    status: statusEnum("status").notNull().default("QUEUE"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
});
