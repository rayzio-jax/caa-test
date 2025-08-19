"use server";

import { eq } from "drizzle-orm";
import { db } from "./db";
import { roomsTable } from "./schema";

const parseStringify = (values: unknown) => {
    return JSON.parse(JSON.stringify(values));
};

export async function getAllRooms() {
    try {
        const rooms = await db.select().from(roomsTable);

        return parseStringify(rooms);
    } catch (error) {
        console.error(error);
    }
}

export async function getQueueRooms() {
    try {
        const rooms = await db.select().from(roomsTable).where(eq(roomsTable.status, "QUEUE"));

        return parseStringify(rooms);
    } catch (error) {
        console.error(error);
    }
}

export async function insertRoom({ room_id, channel_id }: { room_id: string; channel_id: string }) {
    try {
        const inserted = await db
            .insert(roomsTable)
            .values({
                room_id,
                channel_id,
            })
            .returning();

        return parseStringify(inserted);
    } catch (error) {
        console.error(error);
    }
}

export async function updateRoomStatus({ room_id, status }: { room_id: string; status: Rooms["status"] }) {
    const updated_at = new Date();

    try {
        const updated = await db
            .update(roomsTable)
            .set({
                status,
                updated_at,
            })
            .where(eq(roomsTable.room_id, room_id))
            .returning();

        return parseStringify(updated);
    } catch (error) {
        console.error(error);
    }
}
