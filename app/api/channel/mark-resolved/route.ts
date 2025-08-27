import { assignAgent, getFilteredAgents } from "@/lib/qiscus";
import { getQueueRoomsByChannelId, updateRoom } from "@/lib/rooms";
import { responsePayload } from "@/lib/utils";

export async function POST(req: Request) {
    try {
        const {
            channel: { id: channel_id },
            resolved_by: { id: agent_id, name: agent_name },
            service: { room_id },
        } = await req.json();

        const updatedRoom = await updateRoom({ roomId: room_id, channelId: channel_id, agentId: agent_id, roomStatus: "RESOLVED" });

        if (!updatedRoom) {
            throw Error;
        }

        const queueRooms: Room[] = await getQueueRoomsByChannelId(channel_id);

        if (queueRooms.length > 0) {
            for (const room of queueRooms) {
                const { online } = await getFilteredAgents();

                if (!online.agents || online.count === 0) {
                    console.log(`⚠︎ No available agents to handle room ${room.room_id}`);
                    continue;
                }

                const candidateAgent = online.agents[0];
                console.log(`👤 Found agent ${candidateAgent.id}/${candidateAgent.name} for room ${room.room_id}`);
                const assigned = await updateRoom({ roomId: room.room_id, channelId: room.channel_id, agentId: candidateAgent.id, roomStatus: "HANDLED" });
                if (assigned.length > 0) {
                    const res = await assignAgent({ roomId: room.room_id, agentId: candidateAgent.id });
                    console.log(
                        res ? `✅ Success re-allocate agent ${candidateAgent.name} to room ${assigned[0].room_id}` : `❌ Failed re-allocate ${candidateAgent.name} to room ${assigned[0].room_id}`
                    );
                }
            }
        }

        console.log(`✔ Room ${room_id} has resolved by ${agent_id}/${agent_name}`);
        return responsePayload("ok", `success mark as resolved room ${room_id}`, {}, 200);
    } catch (error: any) {
        console.error(error, "Failed to mark room as resolved");
        return responsePayload("error", "internal server error", {}, 500);
    }
}
