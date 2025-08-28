"use server";

import { and, asc, count, eq, isNull, ne, sql } from "drizzle-orm";
import appConfig from "./config";
import { db } from "./db";
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

        return parseStringify(rooms);
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
            .where(and(eq(TbRooms.channelId, channelId), eq(TbRooms.status, "QUEUE")))
            .orderBy(asc(TbRooms.createdAt));

        return parseStringify(rooms);
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
export async function getHandledRooms(agentId: number): Promise<number> {
    try {
        const [countRooms] = await db
            .select({ count: count() })
            .from(TbRooms)
            .where(and(eq(TbRooms.agentId, agentId), eq(TbRooms.status, "HANDLED")))
            .catch((err) => {
                console.error('Failed to get rooms with status "HANDLED".');
                throw err;
            });

        return countRooms.count;
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
                .where(and(eq(TbRooms.id, roomId), eq(TbRooms.channelId, channelId)));

            if (existing) {
                return false;
            }

            const [room] = await tx
                .insert(TbRooms)
                .values({
                    id: roomId,
                    channelId,
                })
                .returning();

            return !!room;
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
    const updatedAt = new Date();

    try {
        const markedRoom = await db.transaction(async (tx) => {
            await tx.execute(sql`SELECT pg_advisory_xact_lock(${agentId})`);

            const [selected] = await tx
                .select()
                .from(TbRooms)
                .where(and(eq(TbRooms.id, roomId), eq(TbRooms.channelId, channelId), eq(TbRooms.status, "HANDLED")))
                .for("update");

            if (!selected) {
                return false;
            }

            const marked = await tx
                .update(TbRooms)
                .set({
                    status: roomStatus,
                    agentId: agentId,
                    updatedAt,
                })
                .where(and(eq(TbRooms.id, roomId), eq(TbRooms.channelId, channelId)))
                .returning();

            return !!marked;
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
    const updatedAt = new Date();
    const MAX_CUSTOMER = appConfig.agentMaxCustomer;

    try {
        const assignedRoom = await db.transaction(async (tx) => {
            await tx.execute(sql`SELECT pg_advisory_xact_lock(${agentId})`);

            const [availableRooms] = await tx
                .select({ count: count() })
                .from(TbRooms)
                .where(and(eq(TbRooms.agentId, agentId), eq(TbRooms.status, "HANDLED")));

            if (availableRooms.count >= MAX_CUSTOMER) {
                return false;
            }

            const [selectedRoom] = await tx
                .select()
                .from(TbRooms)
                .where(and(eq(TbRooms.id, roomId), eq(TbRooms.channelId, channelId), eq(TbRooms.status, "QUEUE")))
                .for("update");

            if (!selectedRoom) {
                return false;
            }

            const [assigned] = await tx
                .update(TbRooms)
                .set({
                    agentId: agentId,
                    status: roomStatus,
                    updatedAt,
                })
                .where(and(eq(TbRooms.id, selectedRoom.id), eq(TbRooms.channelId, selectedRoom.channelId), ne(TbRooms.status, roomStatus), isNull(TbRooms.agentId)))
                .returning();

            return !!assigned;
        });

        return assignedRoom;
    } catch (error) {
        console.error(error);
        throw error;
    }
}
