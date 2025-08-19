import { updateRoomStatus } from "@/lib/rooms";
import { responsePayload } from "@/lib/utils";

export async function POST(req: Request) {
    const data = await req.json();

    console.log("=====================\nMARK AS RESOLVED\n=====================");

    try {
        const {
            resolved_by: { id: agent_id },
            service: { room_id },
        } = data;

        const resolved = await updateRoomStatus({ room_id, agent_id, status: "RESOLVED" });
        console.log(resolved[0]);

        return responsePayload("ok", `success mark as resolved room ${room_id}`, {}, 200);
    } catch (error) {
        console.error("Failed to mark resolved room", error);
        return responsePayload("error", "internal server error", {}, 500);
    }
}
