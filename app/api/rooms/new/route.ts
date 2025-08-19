import { insertRoom } from "@/lib/rooms";
import { NextResponse } from "next/server";

export async function POST(req: Request): Promise<NextResponse<Payload>> {
    try {
        const { room_id, channel_id } = await req.json();

        if (!room_id || !channel_id) {
            return NextResponse.json({ status: "invalid", message: "invalid or empty values", payload: {} }, { status: 400 });
        }

        const data = await insertRoom({ room_id, channel_id });

        if (data) {
            return NextResponse.json({ status: "ok", message: "success adding new room", payload: { data } }, { status: 200 });
        } else {
            return NextResponse.json({ status: "invalid", message: "failed adding new room", payload: {} }, { status: 400 });
        }
    } catch (error) {
        console.error(error);
        return NextResponse.json({ status: "error", message: "internal server error, check server config", payload: {} }, { status: 500 });
    }
}
