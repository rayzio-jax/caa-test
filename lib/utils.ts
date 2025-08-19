import { NextResponse } from "next/server";

export const parseStringify = (value: any) => {
    return JSON.parse(JSON.stringify(value));
};

export const responsePayload = (status: "ok" | "invalid" | "error", message: string, payload: any, statusCode: number) => {
    return NextResponse.json(
        {
            status: status,
            message: message,
            payload: payload,
        },
        { status: statusCode }
    );
};
