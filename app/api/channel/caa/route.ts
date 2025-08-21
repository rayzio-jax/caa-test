import appConfig from "@/lib/config";
import { redis, tryAssignAgent } from "@/lib/redis";
import { getHandledRooms, insertRoom } from "@/lib/rooms";
import { responsePayload } from "@/lib/utils";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
    try {
        const {
            channel: { id: channel_id },
            candidate_agent: candidateAgent,
            room_id,
        } = await req.json();

        const handledRooms = (await getHandledRooms(candidateAgent.id)).length;

        const agentKey = `agent:${candidateAgent.id}:load`;

        const currentLoad = Number(await redis.get(agentKey)) || 0;
        console.log("Current load:", currentLoad);
        console.log("Total handled rooms:", handledRooms);

        if (candidateAgent && handledRooms < appConfig.maxCustomers) {
            await tryAssignAgent("new", room_id, candidateAgent.id, channel_id);
        } else {
            console.log("Agent cannot handle more rooms");
            await insertRoom({ roomId: room_id, channelId: channel_id });
        }

        return NextResponse.json({ status: "ok", message: `room '${room_id} has stored with assigned agent ${candidateAgent.id}' is on QUEUE` }, { status: 200 });
    } catch (error) {
        console.error("Failed to fetch agents", error);
        return responsePayload("error", "internal server error, check config", {}, 500);
    }
}
