import { assignAgent, getAvailableAgents } from "@/lib/qiscus";
import { getQueueRooms, updateRoomStatus } from "@/lib/rooms";
import { responsePayload } from "@/lib/utils";

export async function POST(req: Request) {
    try {
        const {
            resolved_by: { id: agent_id },
            service: { room_id },
        } = await req.json();

        await updateRoomStatus({ room_id, agent_id, status: "RESOLVED" });
        const queueRooms: Rooms[] = await getQueueRooms();

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
                const assignedAgent = availableAgents[0];
                await assignAgent({ room_id: room.room_id, agent_id: assignedAgent.id });

                agentLoads[assignedAgent.id] = (agentLoads[assignedAgent.id] || 0) + 1;

                await updateRoomStatus({ room_id: room.room_id, agent_id, status: "HANDLED" });
                console.log(`✅ Assigned agent ${assignedAgent.id} to room ${room.room_id}`);
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
