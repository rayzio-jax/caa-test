import { NextResponse } from "next/server";

export async function GET() {
    const apiStatus = process.env.API_STATUS!;
    return NextResponse.json({ status: apiStatus, message: "Welcome to CAA API" }, { status: 200 });
}
