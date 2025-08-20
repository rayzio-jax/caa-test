"use server";

import { and, eq, ne } from "drizzle-orm";
import { db } from "./db";
import { roomsTable } from "./schema";

const parseStringify = (values: unknown) => {
    return JSON.parse(JSON.stringify(values));
};

/**
 * Gets the list of all customer rooms
 *
 * @returns {Promise<Room[]>} List of rooms
 */
export async function getAllRooms(): Promise<Room[]> {
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
 * @returns {Promise<Room[]>} List of on-queue rooms
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

export async function insertRoom({ roomId, channelId, agentId, status }: { roomId: number; channelId: number; agentId?: number; status?: Room["status"] }): Promise<Room[]> {
    try {
        const inserted = await db
            .insert(roomsTable)
            .values({
                room_id: roomId,
                channel_id: channelId,
                agent_id: agentId,
                status,
            })
            .returning();

        return parseStringify(inserted) as Room[];
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

export async function updateRoomStatus({ roomId, agentId, status }: { roomId: number; agentId?: number; status: Room["status"] }): Promise<Room[]> {
    const updated_at = new Date();

    try {
        const updated = await db
            .update(roomsTable)
            .set({
                agent_id: agentId,
                status,
                updated_at,
            })
            .where(and(eq(roomsTable.room_id, roomId), ne(roomsTable.status, status)))
            .returning();

        return parseStringify(updated) as Room[];
    } catch (error) {
        console.error(error);
        return [];
    }
}
