import { NextResponse } from "next/server";

export async function POST(req: Request) {
    const data = await req.json();

    // console.log("=====================\nBOT DAMEIN\n=====================");
    // console.log(data);

    return NextResponse.json(data, { status: 200 });
}
