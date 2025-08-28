import appConfig from "@/lib/config";
import { db } from "@/lib/db";
import { TbRooms } from "@/lib/schema";
import axios from "axios";
import { eq, or } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const qty = Number(searchParams.get("qty"));
        const status = searchParams.get("status")?.split(",") || [];

        const query = db
            .select()
            .from(TbRooms)
            .where(status.length > 0 ? or(...status.map((statusRoom) => eq(TbRooms.status, statusRoom as Room["status"]))) : or(eq(TbRooms.status, "QUEUE"), eq(TbRooms.status, "HANDLED")));

        const rooms = !qty || Number.isNaN(qty) || qty === 0 ? await query.execute() : await query.limit(qty).execute();

        if (!rooms || rooms.length === 0 || !Array.isArray(rooms)) {
            return NextResponse.json({ message: "no available rooms to be resolved" }, { status: 404 });
        }

        for (const room of rooms) {
            const res = await axios
                .post(
                    `${appConfig.apiUrl}/api/v1/admin/service/mark_as_resolved`,
                    {
                        room_id: room.id,
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

        const payload = rooms.map((room) => ({ id: room.id, room_id: room.id, channel_id: room.channelId, created_at: room.createdAt }));

        return NextResponse.json({ status: 200, message: "success resolving all rooms", payload }, { status: 200 });
    } catch (error) {
        console.error(error, "Failed to resolve all rooms");
        return NextResponse.json({ status: 500, errors: { message: "internal server error, please check server config" } }, { status: 500 });
    }
}
