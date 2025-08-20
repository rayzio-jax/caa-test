import { assignAgent, getAvailableAgents } from "@/lib/qiscus";
import { insertRoom } from "@/lib/rooms";
import { responsePayload } from "@/lib/utils";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
    try {
        const {
            channel: { id: channel_id },
            room_id,
            candidate_agent,
        } = await req.json();

        const agentLoads: Record<string, number> = {};
        const availableAgents = await getAvailableAgents({ room_id });

        if (availableAgents.length > 0) {
            const assignedAgent = availableAgents[0];

            agentLoads[assignedAgent.id] = (agentLoads[assignedAgent.id] || 0) + 1;

            await assignAgent({ room_id, agent_id: assignedAgent.id });
            await insertRoom({ room_id, channel_id, agent_id: assignedAgent.id, status: "HANDLED" });
            return NextResponse.json({ status: "ok", message: `agent ${assignedAgent.email}:${assignedAgent.id}` }, { status: 200 });
        }

        await insertRoom({ room_id, channel_id });
        return NextResponse.json({ status: "ok", message: `no agent assigned, room '${room_id}' is on QUEUE` }, { status: 200 });
    } catch (error) {
        console.error("Failed to fetch agents", error);
        return responsePayload("error", "internal server error, check config", {}, 500);
    }
}
