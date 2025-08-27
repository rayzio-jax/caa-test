import appConfig from "@/lib/config";
import { db } from "@/lib/db";
import { TbRooms } from "@/lib/schema";
import { responsePayload } from "@/lib/utils";
import axios from "axios";
import { eq, or } from "drizzle-orm";

export async function GET() {
    try {
        const rooms = await db
            .select()
            .from(TbRooms)
            .where(or(eq(TbRooms.status, "QUEUE"), eq(TbRooms.status, "HANDLED")));

        for (const room of rooms) {
            const res = await axios
                .post(
                    `${appConfig.apiUrl}/v1/admin/service/mark_as_resolved`,
                    {
                        room_id: room.room_id,
                    },
                    {
                        headers: {
                            "Content-Type": "application/x-www-form-urlencoded",
                            "Qiscus-App-Id": appConfig.appId,
                            "Qiscus-Secret-Key": appConfig.secretKey,
                        },
                    }
                )
                .then((raw) => raw.data);

            console.log(`✔ Successful resolve room ${res.data.room_info.room.room_id}`);
        }

        return responsePayload("ok", "success resolve all rooms", {}, 200);
    } catch (error) {
        console.error(error, "Failed to resolve all rooms");
        return responsePayload("error", "failed to resolve all rooms", {}, 500);
    }
}
