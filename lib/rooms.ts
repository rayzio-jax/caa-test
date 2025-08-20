"use server";

import { eq } from "drizzle-orm";
import { db } from "./db";
import { roomsTable } from "./schema";

const parseStringify = (values: unknown) => {
    return JSON.parse(JSON.stringify(values));
};

/**
 * Gets the list of all customer rooms
 *
 * @returns {Promise<Rooms[]>} List of rooms
 */
export async function getAllRooms(): Promise<Rooms[]> {
    try {
        const rooms = await db.select().from(roomsTable);

        return parseStringify(rooms);
    } catch (error) {
        console.error(error);
        return [];
    }
}

/**
 * Gets the list of all on-queue customer rooms
 *
 * @returns {Promise<Rooms[]>} List of on-queue rooms
 */
export async function getQueueRooms() {
    try {
        const rooms = await db.select().from(roomsTable).where(eq(roomsTable.status, "QUEUE"));

        return parseStringify(rooms);
    } catch (error) {
        console.error(error);
    }
}

/**
 * Insert a new room into queue list
 *
 * @param {Object} params - Parameters object.
 * @param {string} params.room_id - Customer room id.
 * @param {string} params.channel_id - Qiscus channel id.
 * @param {string} [params.agent_id] - Optional Qiscus agent id.
 * @param {status} [params.status] - Optional room status. See {@link Rooms.status}.
 * @returns {Promise<Rooms>} Return values of inserted room.
 */

export async function insertRoom({ room_id, channel_id, agent_id, status }: { room_id: string; channel_id: string; agent_id?: string; status?: Rooms["status"] }): Promise<Rooms[]> {
    try {
        const inserted = await db
            .insert(roomsTable)
            .values({
                room_id,
                channel_id,
                agent_id,
                status,
            })
            .returning();

        return parseStringify(inserted);
    } catch (error) {
        console.error(error);
        return [];
    }
}

/**
 * Update the status of a room by its ID.
 *
 * @param {Object} params - Parameters object.
 * @param {string} params.room_id - The ID of the room to update.
 * @param {string} [params.agent_id] - Optional agent ID assigned to the room.
 * @param {Rooms.status} params.status - The new room status. See {@link Rooms.status}.
 * @returns {Promise<Rooms>} Return values of the updated room.
 */

export async function updateRoomStatus({ room_id, agent_id, status }: { room_id: string; agent_id?: string; status: Rooms["status"] }) {
    const updated_at = new Date();

    try {
        const updated = await db
            .update(roomsTable)
            .set({
                agent_id,
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
