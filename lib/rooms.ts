"use server";

import { and, asc, count, eq, isNotNull, isNull, ne } from "drizzle-orm";
import appConfig from "./config";
import { db } from "./db";
import { assignAgent, getFilteredAgents } from "./qiscus";
import { TbRooms } from "./schema";
import { parseStringify } from "./utils";

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
            .where(and(eq(TbRooms.channel_id, channelId), eq(TbRooms.status, "QUEUE")))
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
            .where(and(eq(TbRooms.agent_id, agentId), eq(TbRooms.status, "HANDLED")))
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
 * @returns {Promise<boolean>} Return boolean.
 */

export async function addNewRoom({ roomId, channelId }: { roomId: number; channelId: number }): Promise<boolean> {
    try {
        const inserted = await db.transaction(async (tx) => {
            const [existing] = await tx
                .select()
                .from(TbRooms)
                .where(and(eq(TbRooms.room_id, roomId), eq(TbRooms.channel_id, channelId)));

            if (existing) {
                return false;
            }

            const [room] = await tx
                .insert(TbRooms)
                .values({
                    room_id: roomId,
                    channel_id: channelId,
                })
                .returning();

            return room ? true : false;
        });

        return inserted;
    } catch (error) {
        console.error(error);
        throw error;
    }
}

/**
 * Marked room as resolved using transaction lock
 *
 * @param {number} roomId - Room id.
 * @param {number} channelId - Room channel id.
 * @param {number} agentId - Agent id.
 * @param {status} roomStatus - The room waiting status.
 * @returns {Promise<boolean>} Return values of the updated room.
 */

export async function markResolveTx({ roomId, channelId, agentId, roomStatus }: { roomId: number; channelId: number; agentId: number; roomStatus: Room["status"] }): Promise<boolean> {
    const updated_at = new Date();

    try {
        const markedRoom = await db.transaction(async (tx) => {
            const [selected] = await tx
                .select()
                .from(TbRooms)
                .where(and(eq(TbRooms.room_id, roomId), eq(TbRooms.channel_id, channelId)))
                .for("update");

            if (!selected) {
                return false;
            }

            const marked = await tx
                .update(TbRooms)
                .set({
                    status: roomStatus,
                    agent_id: agentId,
                    updated_at,
                })
                .where(and(eq(TbRooms.room_id, roomId), eq(TbRooms.channel_id, channelId)))
                .returning();

            return marked ? true : false;
        });

        return markedRoom;
    } catch (error) {
        console.error(error);
        throw error;
    }
}

/**
 * Assign agent to a room through transaction lock
 *
 * @param {number} roomId - Room id.
 * @param {number} channelId - Room channel id.
 * @param {number} agentId - Agent id.
 * @param {status} roomStatus - The room waiting status.
 * @returns {Promise<boolean>} Return values of the updated room.
 */

export async function assignAgentTx({ roomId, channelId, agentId, roomStatus }: { roomId: number; channelId: number; agentId: number; roomStatus: Room["status"] }): Promise<Room | boolean> {
    const updated_at = new Date();

    try {
        const assignedRoom = await db.transaction(async (tx) => {
            const [availableRooms] = await tx
                .select({ count: count() })
                .from(TbRooms)
                .where(and(eq(TbRooms.agent_id, agentId), eq(TbRooms.status, "HANDLED")));

            if (availableRooms.count > appConfig.agentMaxCustomer) {
                return false;
            }

            const [selectedRoom] = await tx
                .select()
                .from(TbRooms)
                .where(and(eq(TbRooms.room_id, roomId), eq(TbRooms.channel_id, channelId), eq(TbRooms.status, "QUEUE")))
                .for("update");

            if (!selectedRoom) {
                return false;
            }

            const [assigned] = await tx
                .update(TbRooms)
                .set({
                    agent_id: agentId,
                    status: roomStatus,
                    updated_at,
                })
                .where(and(eq(TbRooms.room_id, selectedRoom.room_id), eq(TbRooms.channel_id, selectedRoom.channel_id), ne(TbRooms.status, roomStatus), isNull(TbRooms.agent_id)))
                .returning();

            return assigned ? true : false;
        });

        return assignedRoom;
    } catch (error) {
        console.error(error);
        throw error;
    }
}
