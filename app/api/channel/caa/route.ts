import { assignAgent, getFilteredAgents } from "@/lib/qiscus";
import { addNewRoom, assignAgentTx, getRoomsByChannel } from "@/lib/rooms";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
    try {
        const {
            channel: { id: channel_id },
            room_id,
        } = await req.json();

        const newRoom = await addNewRoom({ roomId: room_id, channelId: channel_id });

        if (!newRoom) {
            return NextResponse.json({ status: 400, message: `Cannot save room ${room_id} to database`, payload: {} }, { status: 400 });
        }

        const queueRooms: Room[] = await getRoomsByChannel(channel_id);

        if (queueRooms.length === 0) {
            console.log("⚠︎ No available room to handle");
        }

        for (const room of queueRooms) {
            const {
                agents: [candidateAgent],
                count: agentCount,
            } = await getFilteredAgents();

            if (!candidateAgent || agentCount === 0) {
                console.log(`⚠︎ No available agents to handle room ${room.id}`);
                continue;
            }

            console.log(`👤 Found agent ${candidateAgent.id}/${candidateAgent.name} for room ${room.id}`);

            const assignedRoom = await assignAgentTx({ channelId: room.channelId, agentId: candidateAgent.id, roomStatus: "HANDLED" });
            if (assignedRoom) {
                await assignAgent({ roomId: room.id, agentId: candidateAgent.id });
            }
        }
        return NextResponse.json({ status: 200, message: `success inserted room ${room_id}`, payload: {} }, { status: 200 });
    } catch (error: any) {
        console.error(error, "Internal database error");
        return NextResponse.json({ errors: { message: "internal server error, please check server config" } }, { status: 500 });
    }
}
