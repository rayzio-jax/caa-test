import { assignAgent, getFilteredAgents } from "@/lib/qiscus";
import { addNewRoom, getQueueRoomsByChannelId, updateRoom } from "@/lib/rooms";
import { responsePayload } from "@/lib/utils";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
    try {
        const {
            channel: { id: channel_id },
            room_id,
        } = await req.json();

        const newRoom = await addNewRoom({ roomId: room_id, channelId: channel_id });

        if (!newRoom) {
            throw new Error("Failed to insert new room");
        }

        const queueRooms: Room[] = await getQueueRoomsByChannelId(channel_id);

        if (queueRooms.length > 0) {
            for (const room of queueRooms) {
                const { online } = await getFilteredAgents();

                if (!online.agents || online.count === 0) {
                    console.log(`⚠︎ No available agents to handle room ${room.room_id}`);
                    continue;
                }

                const candidateAgent = online.agents[0];
                console.log(`👤 Found agent ${candidateAgent.id}/${candidateAgent.name} for room ${room.room_id}`);
                const assigned = await updateRoom({ roomId: room.room_id, channelId: room.channel_id, agentId: candidateAgent.id, roomStatus: "HANDLED" });
                if (assigned.length > 0) {
                    const res = await assignAgent({ roomId: room.room_id, agentId: candidateAgent.id });
                    console.log(res ? `✅ Success allocate ${candidateAgent.name} to room ${assigned[0].room_id}` : `❌ Failed allocate ${candidateAgent.name} to room ${room.room_id}`);
                }
            }
        }

        return NextResponse.json({ status: "ok", message: `success processing room ${room_id}` }, { status: 200 });
    } catch (error: any) {
        console.error(error, "Failed to run agent allocation");
        return responsePayload("error", "Internal server error. Please check server config.", {}, 500);
    }
}
