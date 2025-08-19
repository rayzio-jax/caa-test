import { getAllRooms } from "@/lib/rooms";
import { NextResponse } from "next/server";

export async function GET(): Promise<NextResponse<Payload>> {
    try {
        const data = await getAllRooms();

        if (data) {
            return NextResponse.json({ status: "ok", message: "success fetch all rooms", payload: { data } }, { status: 200 });
        } else {
            return NextResponse.json({ status: "invalid", message: "failed to fetch all rooms", payload: {} }, { status: 400 });
        }
    } catch (error) {
        console.error(error);
        return NextResponse.json({ status: "error", message: "internal server error, check server config", payload: {} }, { status: 500 });
    }
}
