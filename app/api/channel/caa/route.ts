import { getFilteredAgents } from "@/lib/qiscus";
import { addNewRoom, getQueueRoomsByChannelId, updateRoomTransaction } from "@/lib/rooms";
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
                console.log(`✓ No available room to be assigned`);
            } else {
                const { count } = await getFilteredAgents();

                if (count > 0) {
                    await updateRoomTransaction(queueRooms, "HANDLED");
                } else {
                    console.log("⚠︎ No available agents to handle rooms");
                }
            }
        }

        return NextResponse.json({ status: 200, message: `success inserted room ${room_id}`, payload: {} }, { status: 200 });
    } catch (error: any) {
        console.error(error, "Failed to run agent allocation");
        return NextResponse.json({ status: 500, errors: { message: "internal server error, please check server config" } }, { status: 500 });
    }
}
