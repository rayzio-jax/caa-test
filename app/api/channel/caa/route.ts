import { assignAgent, getAvailableAgents } from "@/lib/qiscus";
import { insertRoom } from "@/lib/rooms";
import { parseStringify, responsePayload } from "@/lib/utils";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
    try {
        const {
            channel: { id: channel_id },
            room_id,
            candidate_agent,
        } = await req.json();

        // console.log("================NEW CUSTOMER================");
        // console.log(parseStringify({ channel_id, room_id, candidate_agent: { id: candidate_agent.id, name: candidate_agent.name, email: candidate_agent.email } }));

        const availableAgents = await getAvailableAgents({ room_id });

        if (availableAgents.length > 0) {
            // console.log("================AVAILABLE AGENTS================");
            // console.log(availableAgents);

            const assignedAgentId = availableAgents[0].id;
            await assignAgent({ room_id, agent_id: assignedAgentId });

            const newRoom = await insertRoom({ room_id, channel_id, agent_id: assignedAgentId, status: "HANDLED" });
            // console.log("================NEW ROOM================");
            // console.log(newRoom[0]);
            return NextResponse.json({ status: "ok", message: `agent ${candidate_agent.email}:${candidate_agent.id}` }, { status: 200 });
        }

        const newRoom = await insertRoom({ room_id, channel_id });
        // console.log("================NEW ROOM================");
        // console.log(newRoom[0]);
        return NextResponse.json({ status: "ok", message: `no agent assigned, room '${room_id}' is on QUEUE` }, { status: 200 });
    } catch (error) {
        console.error("Failed to fetch agents", error);
        return responsePayload("error", "internal server error, check config", {}, 500);
    }
}
