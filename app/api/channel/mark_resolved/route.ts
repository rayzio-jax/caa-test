import appConfig from "@/lib/config";
import { assignAgent, getAvailableAgents } from "@/lib/qiscus";
import { getQueueRooms, updateRoomStatus } from "@/lib/rooms";
import { responsePayload } from "@/lib/utils";

export async function POST(req: Request) {
    try {
        const {
            resolved_by: { id: agent_id },
            service: { room_id },
        } = await req.json();

        const resolved = await updateRoomStatus({ room_id, agent_id, status: "RESOLVED" });

        // console.log("================MARK AS RESOLVED================");
        // console.log(resolved[0]);

        const queueRooms: Rooms[] = await getQueueRooms();

        // if (queueRooms.length > 0) {
        //     console.log("================ON QUEUE ROOMS================");
        //     console.log(queueRooms);
        // }

        const agentLoads: Record<string, number> = {};

        for (const room of queueRooms) {
            let availableAgents: Agent[] = [];

            // 🔄 retry up to 3 times (1s, 2s, 3s backoff)
            for (let attempt = 1; attempt <= 3; attempt++) {
                availableAgents = await getAvailableAgents({ room_id: room.room_id, agentLoads });

                availableAgents.forEach((agent) => {
                    if (!(agent.id in agentLoads)) {
                        agentLoads[agent.id] = Number(agent.customerCount) || 0;
                    }
                });

                if (availableAgents.length > 0) break;

                console.log(`No available agents for room ${room.room_id} (attempt ${attempt}), retrying...`);
                await new Promise((res) => setTimeout(res, attempt * 1000)); // exponential-ish backoff
            }

            if (availableAgents.length > 0) {
                // console.log("================AVAILABLE AGENTS================");
                // console.log(availableAgents);

                const assignedAgentId = availableAgents[0].id;
                await assignAgent({ room_id: room.room_id, agent_id: assignedAgentId });

                agentLoads[assignedAgentId] = (agentLoads[assignedAgentId] || 0) + 1;

                const handled = await updateRoomStatus({ room_id: room.room_id, agent_id, status: "HANDLED" });
                // console.log(`================AGENT ${assignedAgentId} HANDLE ON ROOM ${room.room_id}================`);
                // console.log(handled[0]);
            } else {
                console.log(`❌ No agents available for room ${room.room_id}, skipping...`);
                continue;
            }
        }

        return responsePayload("ok", `success mark as resolved room ${room_id}`, {}, 200);
    } catch (error) {
        console.error("Failed to mark resolved room", error);
        return responsePayload("error", "internal server error", {}, 500);
    }
}
