import { assignAgent, getFilteredAgents } from "@/lib/qiscus";
import { addNewRoom, getQueueRoomsByChannelId, updateRoom, updateRoomTransaction } from "@/lib/rooms";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
    try {
        const {
            channel: { id: channel_id },
            room_id,
        } = await req.json();

        const newRoom = await addNewRoom({ roomId: room_id, channelId: channel_id });

        if (newRoom.length === 0) {
            throw new Error(`Failed to save new room ${room_id}`);
        } else {
            const queueRooms: Room[] = await getQueueRoomsByChannelId(channel_id);

            if (queueRooms.length === 0) {
                console.log("⚠︎ No available room to handle");
            }

            for (const room of queueRooms) {
                const {
                    agents: [candidateAgent],
                    count,
                } = await getFilteredAgents();

                if (!candidateAgent || count === 0) {
                    console.log(`⚠︎ No available agents to handle room ${room.room_id}`);
                    continue;
                }

                console.log(`👤 Found agent ${candidateAgent.id}/${candidateAgent.name} for room ${room.room_id}`);
                const [assigned] = await updateRoomTransaction({ roomId: room.room_id, channelId: room.channel_id, agentId: candidateAgent.id, roomStatus: "HANDLED" });
                if (assigned) {
                    const res = await assignAgent({ roomId: room.room_id, agentId: candidateAgent.id });

                    if (!res) {
                        console.log(`❌ Failed allocate ${candidateAgent.name} to room ${room.room_id}`);
                    }
                }
            }
        }

        return NextResponse.json({ status: 200, message: `success inserted room ${room_id}`, payload: {} }, { status: 200 });
    } catch (error: any) {
        console.error(error, "Failed to run agent allocation");
        return NextResponse.json({ errors: { message: "internal server error, please check server config" } }, { status: 500 });
    }
}
