import appConfig from "@/lib/config";
import { assignAgent, getAgents, getFilteredAgents } from "@/lib/qiscus";
import { getHandledRooms, getQueueRoomsByChannelId, updateRoom } from "@/lib/rooms";
import { responsePayload } from "@/lib/utils";

const MAX_CUSTOMER = appConfig.agentMaxCustomer;

export async function POST(req: Request) {
    try {
        const {
            channel: { id: channel_id },
            resolved_by: { id: agent_id, name: agent_name },
            service: { room_id },
        } = await req.json();

        await updateRoom({ roomId: room_id, channelId: channel_id, agentId: agent_id, roomStatus: "RESOLVED" });

        const { online } = await getFilteredAgents();
        const candidateAgent = online.agents[0];
        const handledRooms = (await getHandledRooms(agent_id)).length;
        const queueRooms: Room[] = await getQueueRoomsByChannelId(channel_id);

        if (handledRooms < MAX_CUSTOMER && queueRooms.length > 0 && candidateAgent) {
            const room = await updateRoom({ roomId: queueRooms[0].room_id, channelId: queueRooms[0].channel_id, agentId: candidateAgent.id, roomStatus: "HANDLED" });
            await assignAgent({ agentId: Number(room[0].agent_id), roomId: room[0].room_id });
            console.log(`✅ ${room_id} resolved by ${agent_id}/${agent_name}`);
        }

        return responsePayload("ok", `success mark as resolved room ${room_id}`, {}, 200);
    } catch (error) {
        console.error("Failed to mark resolved room", error);
        return responsePayload("error", "internal server error", {}, 500);
    }
}
