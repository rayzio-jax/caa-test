import appConfig from "@/lib/config";
import { getAgents } from "@/lib/qiscus";
import { canDebounced, redis, resolveRoom, tryAssignAgent } from "@/lib/redis";
import { getHandledRooms, getQueueRooms } from "@/lib/rooms";
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
            const agents: Agent[] = await getAgents();
            const handledRooms: Room[] = await getHandledRooms(agent_id);

            if (agents.length === 0 || handledRooms.length > 2) {
                console.log(`❌ No agents available for room ${room.room_id}, skipping...`);
                continue;
            }

            let assigned = false;
            for (const agent of agents) {
                const agentKey = `agent:${agent.id}:load`;

                const currentLoad = Number(await redis.get(agentKey)) || 0;
                const maxCapacity = appConfig.maxCustomers || 2;

                if (currentLoad >= maxCapacity) {
                    console.log(`Agent ${agent.id} has reached max capacity (${maxCapacity}), skipping...`);
                    continue;
                }

                assigned = await tryAssignAgent("update", room.room_id, agent.id);
                if (assigned) {
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
