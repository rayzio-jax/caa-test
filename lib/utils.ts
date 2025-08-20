import { NextResponse } from "next/server";

/** Use to parse value into JSON object */
export const parseStringify = (value: any) => {
    return JSON.parse(JSON.stringify(value));
};

/**
 * Creates a standardized response payload.
 *
 * @param {"ok" | "invalid" | "error"} status - The response status.
 * @param {string} message - A human-readable message describing the result.
 * @param {*} payload - The data payload to include in the response.
 * @param {number} statusCode - The HTTP status code.
 * @returns {{ status: "ok" | "invalid" | "error", message: string, payload: *, statusCode: number }} An object containing the response status, message, payload, and status code.
 */
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
