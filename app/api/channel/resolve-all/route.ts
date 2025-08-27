import appConfig from "@/lib/config";
import { db } from "@/lib/db";
import { TbRooms } from "@/lib/schema";
import axios from "axios";
import { eq, or } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function GET() {
    try {
        const rooms = await db
            .select()
            .from(TbRooms)
            .where(or(eq(TbRooms.status, "QUEUE"), eq(TbRooms.status, "HANDLED")));

        if (!rooms || rooms.length === 0 || !Array.isArray(rooms)) {
            return NextResponse.json({ message: "no available rooms to be resolved" }, { status: 404 });
        }

        for (const room of rooms) {
            const res = await axios
                .post(
                    `${appConfig.apiUrl}/api/v1/admin/service/mark_as_resolved`,
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

        const payload = rooms.map((room) => ({ id: room.id, room_id: room.room_id, channel_id: room.channel_id, created_at: room.created_at }));

        return NextResponse.json({ message: "success resolving all rooms", payload }, { status: 200 });
    } catch (error) {
        console.error(error, "Failed to resolve all rooms");
        return NextResponse.json({ errors: { message: "internal server error, please check server config" } }, { status: 500 });
    }
}
