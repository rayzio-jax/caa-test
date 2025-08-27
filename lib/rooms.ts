"use server";

import { and, asc, eq, count, ne, isNull } from "drizzle-orm";
import appConfig from "./config";
import { db } from "./db";
import { TbRooms } from "./schema";
import { parseStringify } from "./utils";
import { getFilteredAgents } from "./qiscus";

const MAX_CUSTOMER = appConfig.agentMaxCustomer || 2;

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
        throw error;
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
            .orderBy(asc(TbRooms.created_at));

        return parseStringify(rooms) as Room[];
    } catch (error) {
        console.error(error);
        throw error;
    }
}

/**
 * Gets the list of all handled customer rooms
 *
 * @param {string} agentId - Id of agent that handle the room
 * @returns {Promise<Room[]>} List of handled rooms
 */
export async function getHandledRooms(agentId: number) {
    try {
        const countRooms = await db
            .select({ count: count() })
            .from(TbRooms)
            .where(and(eq(TbRooms.agent_id, agentId.toString()), eq(TbRooms.status, "HANDLED")))
            .catch((err) => {
                console.error('Failed to get rooms with status "HANDLED".');
                throw err;
            });

        return countRooms;
    } catch (error) {
        console.error(error);
        throw error;
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
        throw error;
    }
}

export async function updateRoom({ roomId, channelId, agentId, roomStatus }: { roomId: number; channelId: number; agentId: number; roomStatus: Room["status"] }): Promise<Room[]> {
    const updated_at = new Date();

    try {
        const room = await db
            .update(TbRooms)
            .set({
                agent_id: agentId?.toString(),
                status: roomStatus,
                updated_at,
            })
            .where(and(eq(TbRooms.room_id, roomId.toString()), eq(TbRooms.channel_id, channelId.toString()), ne(TbRooms.status, roomStatus)))
            .returning();

        return parseStringify(room) as Room[];
    } catch (error) {
        console.error(error);
        throw error;
    }
}

/**
 * Assign agent to a room through transaction lock
 *
 * @param {Object} params - Parameters object.
 * @param {string} params.roomId - The ID of the room to update.
 * @param {string} params.channelId - The room's channel.
 * @param {status} params.roomStatus - Optional room status. See Room["status"].
 * @returns {Promise<Rooms>} Return values of the updated room.
 */

export async function updateRoomTransaction({ roomId, channelId, roomStatus }: { roomId: number; channelId: number; roomStatus: Room["status"] }): Promise<Room[]> {
    const updated_at = new Date();

    try {
        const room = await db
            .transaction(async (tx) => {
                const room = await tx
                    .select()
                    .from(TbRooms)
                    .where(and(eq(TbRooms.room_id, roomId.toString()), eq(TbRooms.channel_id, channelId.toString())))
                    .for("update");

                if (room.length === 0) {
                    console.log("❌ No available room to update");
                    throw new Error(`❌ Room ${roomId} not found`);
                }

                const { agents, count } = await getFilteredAgents();

                if (!agents[0] || count === 0) {
                    console.log(`⚠︎ No available agents to handle room ${room[0].room_id}`);
                    throw new Error("NO_AGENT_AVAILABLE");
                }

                console.log(`👤 Found agent ${agents[0].id}/${agents[0].name} for room ${room[0].room_id}`);
                const updated = await tx
                    .update(TbRooms)
                    .set({
                        agent_id: agents[0].id.toString(),
                        status: roomStatus,
                        updated_at,
                    })
                    .where(and(eq(TbRooms.room_id, room[0].room_id), eq(TbRooms.channel_id, room[0].channel_id), ne(TbRooms.status, roomStatus), isNull(TbRooms.agent_id)))
                    .returning();

                return updated;
            })
            .catch((err) => {
                console.error(`${err.statusText} ${err.status}`);
                throw err;
            });

        return parseStringify(room) as Room[];
    } catch (error) {
        console.error(error);
        throw error;
    }
}
