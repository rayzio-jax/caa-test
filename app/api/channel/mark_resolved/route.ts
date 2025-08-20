import { assignAgent, getAvailableAgents } from "@/lib/qiscus";
import { canDebounced } from "@/lib/redis";
import { getQueueRooms, updateRoomStatus } from "@/lib/rooms";
import { responsePayload } from "@/lib/utils";

export async function POST(req: Request) {
    try {
        const {
            resolved_by: { id: agent_id },
            service: { room_id },
        } = await req.json();

        const canRun = await canDebounced("assign_agents_lock", 3); // 3-second debounce
        if (!canRun) {
            return responsePayload("ok", "⏳ skipped - debounce lock active", {}, 200);
        }

        await updateRoomStatus({ roomId: room_id, agentId: agent_id, status: "RESOLVED" });
        const queueRooms: Rooms[] = await getQueueRooms();

        const agentLoads: Record<string, number> = {};

        for (const room of queueRooms) {
            let availableAgents: Agent[] = [];

            // 🔄 retry up to 5 times (1s, 2s, 3s -> backoff)
            for (let attempt = 1; attempt <= 3; attempt++) {
                availableAgents = await getAvailableAgents({ roomId: room.room_id, agentLoads });

                availableAgents.forEach((agent) => {
                    if (!(agent.id in agentLoads)) {
                        agentLoads[agent.id] = Number(agent.customerCount) || 0;
                    }
                });

                if (availableAgents.length > 0) break;

                console.log(`No available agents for room ${room.room_id} (attempt ${attempt}), retrying...`);
                await new Promise((res) => setTimeout(res, attempt * 1000)); // exponential-ish backoff
            }

            const candidateAgent = availableAgents[0];
            if (availableAgents.length > 0 && agentLoads[candidateAgent.id] < 2) {
                await assignAgent({ roomId: room.room_id, agentId: candidateAgent.id });

                agentLoads[candidateAgent.id] = (agentLoads[candidateAgent.id] || 0) + 1;

                await updateRoomStatus({ roomId: room.room_id, agentId: candidateAgent.id, status: "HANDLED" });
                console.log(`✅ Assigned agent ${candidateAgent.id} to room ${room.room_id}`);
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
