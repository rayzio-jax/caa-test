import appConfig from "@/lib/config";
import { assignAgent, getAvailableAgents } from "@/lib/qiscus";
import { canDebounced, redis, resolveRoom, tryAssignAgent } from "@/lib/redis";
import { getQueueRooms, updateRoomStatus } from "@/lib/rooms";
import { responsePayload } from "@/lib/utils";

export async function POST(req: Request) {
    try {
        const {
            resolved_by: { id: agent_id },
            service: { room_id },
        } = await req.json();

        // Debounce with a 3-second lock
        const lockId = "assign_agents_lock";
        const debounceMs = 3000;

        // Attempt to acquire lock with retry for the latest request
        let canRun = false;
        for (let attempt = 1; attempt <= 3; attempt++) {
            canRun = await canDebounced(lockId, debounceMs);
            if (canRun) break;
            // Wait briefly before retrying to allow the lock to expire
            await new Promise((res) => setTimeout(res, 100 * attempt));
        }

        if (!canRun) {
            return responsePayload("ok", "⏳ Skipped - debounce lock active", {}, 200);
        }

        await resolveRoom(room_id, agent_id);
        const queueRooms: Room[] = await getQueueRooms();

        for (const room of queueRooms) {
            const availableAgents: Agent[] = await getAvailableAgents({ roomId: room.room_id });

            if (availableAgents.length === 0) {
                console.log(`❌ No agents available for room ${room.room_id}, skipping...`);
                continue;
            }

            let assigned = false;
            const candidateAgent = availableAgents[0];
            for (const agent of availableAgents) {
                const agentKey = `agent:${candidateAgent.id}:load`;

                const currentLoad = Number(await redis.get(agentKey)) || 0;
                const maxCapacity = appConfig.maxCustomers || 2;

                if (currentLoad >= maxCapacity) {
                    console.log(`Agent ${agent.id} has reached max capacity (${maxCapacity}), skipping...`);
                    continue;
                }

                assigned = await tryAssignAgent(room.room_id, agent);
                if (assigned) {
                    console.log(`✅ Assigned room ${room.room_id} to agent ${agent.id}`);
                    break;
                } else {
                    console.log(`❌ Could not assign agent ${agent.id} to room ${room.room_id}`);
                }
            }

            if (!assigned) {
                console.log(`❌ No suitable agents available for room ${room.room_id}`);
            }
        }

        await redis.del(lockId);

        return responsePayload("ok", `success mark as resolved room ${room_id}`, {}, 200);
    } catch (error) {
        console.error("Failed to mark resolved room", error);
        return responsePayload("error", "internal server error", {}, 500);
    }
}
