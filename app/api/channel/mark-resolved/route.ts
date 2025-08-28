import { assignAgent, getFilteredAgents } from "@/lib/qiscus";
import { getQueueRoomsByChannelId, markResolveTx, assignAgentTx } from "@/lib/rooms";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
    try {
        const {
            channel: { id: channel_id },
            resolved_by: { id: agent_id, name: agent_name },
            service: { room_id },
        } = await req.json();

        const updatedRoom = await markResolveTx({ roomId: Number(room_id), channelId: Number(channel_id), agentId: Number(agent_id), roomStatus: "RESOLVED" });

        if (!updatedRoom) {
            throw new Error(`Failed to mark as resolve room ${room_id}`);
        }

        const queueRooms: Room[] = await getQueueRoomsByChannelId(channel_id);

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

            const assignedRoom = await assignAgentTx({ roomId: room.id, channelId: room.channelId, agentId: candidateAgent.id, roomStatus: "HANDLED" });
            if (assignedRoom) {
                await assignAgent({ roomId: room.id, agentId: candidateAgent.id });
            }
        }

        console.log(`✓ Room ${room_id} has resolved by ${agent_id}/${agent_name}`);
        return NextResponse.json({ status: 200, message: `success resolved room ${room_id} by ${agent_id}`, payload: {} }, { status: 200 });
    } catch (error: any) {
        console.error(error, "Internal database error");
        return NextResponse.json({ status: 500, errors: { message: "internal server error, please check server config" } }, { status: 500 });
    }
}
