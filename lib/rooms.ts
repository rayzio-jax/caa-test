"use server";

import { and, asc, eq, ne } from "drizzle-orm";
import { db } from "./db";
import { TbRooms } from "./schema";

const parseStringify = (values: unknown) => {
    return JSON.parse(JSON.stringify(values));
};

/**
 * Gets the list of all customer rooms
 *
 * @returns {Promise<Room[]>} List of rooms
 */
export async function getRooms(): Promise<Room[]> {
    try {
        const rooms = await db
            .select()
            .from(TbRooms)
            .catch((err) => {
                console.error("Failed to get all room.");
                throw err;
            });

        return parseStringify(rooms) as Room[];
    } catch (error) {
        console.error(error);
        return [];
    }
}

/**
 * Gets the list of all on-queue customer rooms
 *
 * @param {string} channelId - The chat room channel id
 * @returns {Promise<Room[]>} List of on-queue rooms
 */
export async function getQueueRoomsByChannelId(channelId: number): Promise<Room[]> {
    try {
        const rooms = await db
            .select()
            .from(TbRooms)
            .where(and(eq(TbRooms.channel_id, channelId.toString()), eq(TbRooms.status, "QUEUE")))
            .orderBy(asc(TbRooms.created_at))
            .catch((err) => {
                console.error(`Failed to get rooms with status "QUEUE"${channelId && ` on channel ${channelId}`}.`);
                throw err;
            });

        return parseStringify(rooms) as Room[];
    } catch (error) {
        console.error(error);
        return [];
    }
}

/**
 * Gets the list of all handled customer rooms
 *
 * @param {string} agentId - Id of agent that handle the room
 * @returns {Promise<Room[]>} List of handled rooms
 */
export async function getHandledRooms(agentId: number): Promise<Room[]> {
    try {
        const rooms = await db
            .select()
            .from(TbRooms)
            .where(and(eq(TbRooms.agent_id, agentId.toString()), eq(TbRooms.status, "HANDLED")))
            .catch((err) => {
                console.error('Failed to get rooms with status "HANDLED".');
                throw err;
            });

        return parseStringify(rooms) as Room[];
    } catch (error) {
        console.error(error);
        return [];
    }
}

/**
 * Insert a new room into queue list
 *
 * @param {Object} params - Parameters object.
 * @param {string} params.roomId - Customer room id.
 * @param {string} params.channelId - Qiscus channel id.
 * @returns {Promise<Rooms>} Return values of inserted room.
 */

export async function addNewRoom({ roomId, channelId }: { roomId: number; channelId: number }): Promise<Room[]> {
    try {
        const inserted = await db
            .insert(TbRooms)
            .values({
                room_id: roomId.toString(),
                channel_id: channelId.toString(),
            })
            .returning()
            .catch((err) => {
                console.error("Failed adding new room to database. Missing required values or internal error.");
                throw err;
            });

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
 * @param {string} params.roomId - The ID of the room to update.
 * @param {string} params.channelId - The room's channel.
 * @param {string} params.agentId - Optional agent ID assigned to the room.
 * @param {status} params.roomStatus - Optional room status. See Room["status"].
 * @returns {Promise<Rooms>} Return values of the updated room.
 */

export async function updateRoom({ roomId, channelId, agentId, roomStatus }: { roomId: number; channelId: number; agentId: number; roomStatus: Room["status"] }): Promise<Room[]> {
    const updated_at = new Date();

    try {
        const updated = await db
            .update(TbRooms)
            .set({
                agent_id: String(agentId),
                status: roomStatus,
                updated_at,
            })
            .where(and(eq(TbRooms.room_id, roomId.toString()), eq(TbRooms.channel_id, channelId.toString()), ne(TbRooms.status, roomStatus)))
            .returning()
            .catch((err) => {
                console.error(`Failed to update room. Missing required values or internal error.`);
                throw err;
            });

        return parseStringify(updated) as Room[];
    } catch (error) {
        console.error(error);
        return [];
    }
}
