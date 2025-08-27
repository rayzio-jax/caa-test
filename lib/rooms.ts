"use server";

import { and, asc, count, eq, isNull, ne } from "drizzle-orm";
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
 * @returns {Promise<Rooms>} Return values of inserted room.
 */

export async function addNewRoom({ roomId, channelId }: { roomId: number; channelId: number }): Promise<Room[]> {
    try {
        const inserted = await db
            .insert(TbRooms)
            .values({
                room_id: roomId,
                channel_id: channelId,
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

/**
 * Update room data based on room id and channel id
 *
 * @param {Object} params - Parameters object.
 * @param {number} params.roomId - Targetted room id
 * @param {number} params.channelId - Targetted channel id
 * @param {number} params.agentId - The agent that will be assigned
 * @param {status} params.roomStatus - The room waiting status.
 * @returns {Promise<Rooms[]>} Return values of the updated room.
 */

export async function updateRoom({ roomId, channelId, agentId, roomStatus }: { roomId: number; channelId: number; agentId: number; roomStatus: Room["status"] }): Promise<Room[]> {
    const updated_at = new Date();

    try {
        const room = await db
            .update(TbRooms)
            .set({
                agent_id: agentId,
                status: roomStatus,
                updated_at,
            })
            .where(and(eq(TbRooms.room_id, roomId), eq(TbRooms.channel_id, channelId), ne(TbRooms.status, roomStatus)))
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
 * @param {Array} rooms - Array of rooms.
 * @param {status} roomStatus - The room waiting status.
 * @returns {Promise<Rooms[]>} Return values of the updated room.
 */

export async function updateRoomTransaction(rooms: Room[], roomStatus: Room["status"]): Promise<Room[]> {
    const updated_at = new Date();

    try {
        const updatedRooms = await db.transaction(async (tx) => {
            const results: Room[] = [];

            for (const room of rooms) {
                const { room_id, channel_id, status, updated_at: original_updated_at } = room;

                const [selectedRoom] = await tx
                    .select()
                    .from(TbRooms)
                    .where(and(eq(TbRooms.room_id, room_id), eq(TbRooms.channel_id, channel_id)))
                    .for("update");

                if (!selectedRoom) {
                    console.log(`❌ Cannot find room ${room_id}`);
                    throw new Error("❌ No available room");
                }

                if (new Date(selectedRoom.updated_at).getTime() !== new Date(original_updated_at).getTime()) {
                    console.log(`❌ Room ${room_id} was modified by another transaction`);
                    throw new Error("❌ Current room was modified by another transaction");
                }

                const {
                    agents: [candidateAgent],
                    count,
                } = await getFilteredAgents();

                console.log(candidateAgent);

                if (!candidateAgent || candidateAgent.current_customer_count > 2 || count === 0) {
                    console.log(`⚠︎ No available agents to handle room ${room_id}`);
                    throw new Error("⚠︎ No available agents to handle current room");
                }

                console.log(`👤 Found agent ${candidateAgent.id}/${candidateAgent.name} for room ${room_id}`);
                const [updated] = await tx
                    .update(TbRooms)
                    .set({
                        agent_id: candidateAgent.id,
                        status: roomStatus,
                        updated_at,
                    })
                    .where(and(eq(TbRooms.room_id, room_id), eq(TbRooms.channel_id, channel_id), ne(TbRooms.status, roomStatus), isNull(TbRooms.agent_id)))
                    .returning();

                if (updated) {
                    const res = await assignAgent({ roomId: room_id, agentId: candidateAgent.id });

                    if (res) {
                        const converted: Room = { ...updated, agent_id: updated.agent_id ?? undefined };
                        results.push(converted);

                        console.log(`✓ Success assigned ${candidateAgent.name} to room ${room_id}`);
                    } else {
                        console.log(`❌ Failed to assign agent to room ${room_id}`);
                        throw new Error("❌ Failed to assign agent to current room");
                    }
                } else {
                    throw new Error("❌ Failed to update the current room");
                }
            }

            return results;
        });

        return parseStringify(updatedRooms) as Room[];
    } catch (error) {
        console.error(error);
        throw error;
    }
}
