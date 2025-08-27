import { assignAgent, getFilteredAgents } from "@/lib/qiscus";
import { addNewRoom, getQueueRoomsByChannelId, updateRoom, updateRoomTransaction } from "@/lib/rooms";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
    const {
        channel: { id: channel_id },
        room_id,
    } = await req.json();

    try {
        const newRoom = await addNewRoom({ roomId: room_id, channelId: channel_id });

        if (!newRoom) {
            throw new Error("Failed to insert new room");
        }

        const queueRooms: Room[] = await getQueueRoomsByChannelId(channel_id);

        if (queueRooms.length === 0) {
            console.log(`✓ No available room to be assigned`);
        } else {
            for (const room of queueRooms) {
                const assigned = await updateRoomTransaction({ roomId: room.room_id, channelId: room.channel_id, roomStatus: "HANDLED" });
                if (assigned.length > 0) {
                    await assignAgent({ roomId: room.room_id, agentId: Number(assigned[0].agent_id) });
                } else {
                    console.log(`❌ No available agent to be assigned to room ${room.room_id}`);
                }
            }
        }

        return NextResponse.json({ message: `success added room ${room_id}`, payload: {} }, { status: 200 });
    } catch (error: any) {
        console.error(error, "Failed to run agent allocation");
        return NextResponse.json({ errors: { message: "internal server error, please check server config" } }, { status: 500 });
    }
}
