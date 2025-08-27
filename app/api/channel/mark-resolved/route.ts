import { getFilteredAgents } from "@/lib/qiscus";
import { getQueueRoomsByChannelId, updateRoom, updateRoomTransaction } from "@/lib/rooms";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
    try {
        const {
            channel: { id: channel_id },
            resolved_by: { id: agent_id, name: agent_name },
            service: { room_id },
        } = await req.json();

        const updatedRoom = await updateRoom({ roomId: room_id, channelId: channel_id, agentId: agent_id, roomStatus: "RESOLVED" });

        if (updatedRoom.length === 0) {
            throw new Error(`Failed to mark as resolve room ${room_id}`);
        } else {
            const queueRooms: Room[] = await getQueueRoomsByChannelId(channel_id);

            if (queueRooms.length === 0) {
                console.log(`❗ No available room to be assigned`);
            } else {
                const { count } = await getFilteredAgents();

                if (count > 0) {
                    await updateRoomTransaction(queueRooms, "HANDLED");
                } else {
                    console.log("⚠︎ No available agents to handle rooms");
                }
            }
        }

        console.log(`✓ Room ${room_id} has resolved by ${agent_id}/${agent_name}`);
        return NextResponse.json({ status: 200, message: `success resolved room ${room_id} by ${agent_id}`, payload: {} }, { status: 200 });
        return;
    } catch (error: any) {
        console.error(error, "Failed to mark room as resolved");
        return NextResponse.json({ status: 500, errors: { message: "internal server error, please check server config" } }, { status: 500 });
    }
}
