import appConfig from "@/lib/config";
import { getAgents } from "@/lib/qiscus";
import { redis, resetAgentLoad, resolveRoom, tryAssignAgent } from "@/lib/redis";
import { getHandledRooms, getQueueRoomsByChannel } from "@/lib/rooms";
import { responsePayload } from "@/lib/utils";

export async function POST(req: Request) {
    try {
        const {
            channel: { id: channel_id },
            resolved_by: { id: agent_id },
            service: { room_id },
        } = await req.json();

        await resolveRoom({ roomId: room_id, channelId: channel_id, agentId: agent_id });

        const queueRooms: Room[] = await getQueueRoomsByChannel(channel_id);

        for (const room of queueRooms) {
            const agents = await getAgents();
            const handledRooms: Room[] = await getHandledRooms(agent_id);

            if (agents.offline.find((agent) => agent.id === agent_id)) {
                await resetAgentLoad(agent_id);
                return;
            }

            if (agents.online.length === 0 || handledRooms.length > appConfig.maxCustomers) {
                console.log(`❌ No agents available for room ${room.room_id}, skipping...`);
                continue;
            }

            let assigned = false;
            for (const agent of agents.online) {
                const agentKey = `agent:${agent.id}:load`;

                const currentLoad = Number(await redis.get(agentKey)) || 0;
                const maxCapacity = appConfig.maxCustomers || 2;

                if (currentLoad >= maxCapacity) {
                    console.log(`Agent ${agent.id} has reached max capacity (${maxCapacity}), skipping...`);
                    continue;
                }

                assigned = await tryAssignAgent({ type: "update", roomId: room.room_id, channelId: channel_id, agent });
                if (assigned) {
                    return responsePayload("ok", `success re-assigned agent ${agent.id} to room ${room_id}`, {}, 200);
                } else {
                    console.log(`❌ Could not assign agent ${agent.id} to room ${room.room_id}`);
                }
            }

            if (!assigned) {
                console.log(`❌ No suitable agents available for room ${room.room_id}`);
            }
        }

        return responsePayload("ok", `success mark as resolved room ${room_id}`, {}, 200);
    } catch (error) {
        console.error("Failed to mark resolved room", error);
        return responsePayload("error", "internal server error", {}, 500);
    }
}
