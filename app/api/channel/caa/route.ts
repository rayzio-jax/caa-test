import appConfig from "@/lib/config";
import { assignAgent, getAgents, getFilteredAgents } from "@/lib/qiscus";
import { addNewRoom, getHandledRooms, getQueueRoomsByChannelId, updateRoom } from "@/lib/rooms";
import { responsePayload } from "@/lib/utils";
import { NextResponse } from "next/server";

const MAX_CUSTOMER = appConfig.agentMaxCustomer;

export async function POST(req: Request) {
    try {
        const {
            channel: { id: channel_id },
            room_id,
        } = await req.json();

        const room = await addNewRoom({ roomId: room_id, channelId: channel_id });

        if (!room) {
            throw new Error("Failed to insert new room.");
        }

        const { online } = await getFilteredAgents();
        const candidateAgentId = online.agents[0].id;
        const handledRooms = (await getHandledRooms(candidateAgentId)).length;
        const queueRooms: Room[] = await getQueueRoomsByChannelId(channel_id);

        console.log(`❗ Current ${candidateAgentId} load: ${handledRooms}`);

        if (online.count > 0 && candidateAgentId && handledRooms < MAX_CUSTOMER) {
            const room = await updateRoom({ roomId: queueRooms[0].room_id, channelId: queueRooms[0].channel_id, agentId: candidateAgentId, roomStatus: "HANDLED" });

            if (room) {
                await assignAgent({ roomId: room_id, agentId: candidateAgentId });
                console.log(`❗ Current ${candidateAgentId} load: ${handledRooms + 1}`);
            }
        } else {
            console.log(`⚠️ Agent cannot handle more rooms`);
            await addNewRoom({ roomId: room_id, channelId: channel_id });
        }

        return NextResponse.json({ status: "ok", message: `success processing room ${room_id}` }, { status: 200 });
    } catch (error) {
        console.error("Failed to process Custom Allocation.", error);
        return responsePayload("error", "Internal server error. Please check server config.", {}, 500);
    }
}
