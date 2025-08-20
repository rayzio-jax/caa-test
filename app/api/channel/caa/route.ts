import { assignAgent, getAvailableAgents } from "@/lib/qiscus";
import { getAllRooms, insertRoom } from "@/lib/rooms";
import { responsePayload } from "@/lib/utils";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
    try {
        const {
            channel: { id: channel_id },
            candidate_agent: candidateAgent,
            room_id,
        } = await req.json();

        const rooms = await getAllRooms();
        const handledRooms = rooms.filter((room) => room.agent_id === candidateAgent.id && room.status === "HANDLED").length;

        if (candidateAgent && handledRooms < 2) {
            await insertRoom({ roomId: room_id, channelId: channel_id, agentId: candidateAgent.id, status: "HANDLED" });
            await assignAgent({ roomId: room_id, agentId: candidateAgent.id });
        } else {
            await insertRoom({ roomId: room_id, channelId: channel_id });
        }

        return NextResponse.json({ status: "ok", message: `room '${room_id} has stored with assigned agent ${candidateAgent.id}' is on QUEUE` }, { status: 200 });
    } catch (error) {
        console.error("Failed to fetch agents", error);
        return responsePayload("error", "internal server error, check config", {}, 500);
    }
}
