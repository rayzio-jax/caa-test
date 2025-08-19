import { updateRoomStatus } from "@/lib/rooms";
import { NextResponse } from "next/server";

export async function PUT(req: Request): Promise<NextResponse<Payload>> {
    try {
        const { searchParams } = new URL(req.url);
        const roomId = searchParams.get("room_id") as string;

        const { status } = await req.json();
        if (!status || !roomId) {
            return NextResponse.json({ status: "invalid", message: "invalid or empty values", payload: {} }, { status: 400 });
        }

        const roomStatus: Rooms["status"] = status;

        const data = await updateRoomStatus({ room_id: roomId, status: roomStatus.toUpperCase() as Rooms["status"] });

        if (data) {
            return NextResponse.json({ status: "ok", message: "success update room status", payload: { data } }, { status: 200 });
        } else {
            return NextResponse.json({ status: "invalid", message: "failed updating room status", payload: {} }, { status: 400 });
        }
    } catch (error) {
        console.error(error);
        return NextResponse.json({ status: "error", message: "internal server error, check server config", payload: {} }, { status: 500 });
    }
}
