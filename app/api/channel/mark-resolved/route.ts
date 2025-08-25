import appConfig from "@/lib/config";
import { assignAgent, getAgents, getFilteredAgents } from "@/lib/qiscus";
import { getHandledRooms, getQueueRoomsByChannelId, updateRoom } from "@/lib/rooms";
import { responsePayload } from "@/lib/utils";

const MAX_CUSTOMER = appConfig.agentMaxCustomer;

export async function POST(req: Request) {
    try {
        const {
            channel: { id: channel_id },
            resolved_by: { id: agent_id },
            service: { room_id },
        } = await req.json();

        await updateRoom({ roomId: room_id, channelId: channel_id, agentId: agent_id, roomStatus: "RESOLVED" });

        const queueRooms: Room[] = await getQueueRoomsByChannelId(channel_id);
        const handledRooms = (await getHandledRooms(agent_id)).length;
        const { online } = await getFilteredAgents();

        if (online.count > 0 && queueRooms.length > 0 && handledRooms < MAX_CUSTOMER) {
            await updateRoom({ roomId: queueRooms[0].room_id, channelId: queueRooms[0].channel_id, agentId: agent_id, roomStatus: "HANDLED" });
            await assignAgent({ agentId: agent_id, roomId: queueRooms[0].room_id });
        }

        return responsePayload("ok", `success mark as resolved room ${room_id}`, {}, 200);
    } catch (error) {
        console.error("Failed to mark resolved room", error);
        return responsePayload("error", "internal server error", {}, 500);
    }
}
