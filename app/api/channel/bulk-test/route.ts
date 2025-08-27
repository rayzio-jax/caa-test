import appConfig from "@/lib/config";
import axios from "axios";
import { NextResponse } from "next/server";
import { faker } from "@faker-js/faker";

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const qty = Number(searchParams.get("qty"));

        let results = [];

        for (let i = 0; i < qty; i++) {
            const res = await axios
                .post(
                    `${appConfig.apiUrl}/${appConfig.appId}/api/v2/custom_channel/send`,
                    {
                        identifier_key: "sheep",
                        user_id: `${faker.internet.username()}@mail.com`,
                        name: `${faker.person.firstName()} ${faker.person.lastName()}`,
                        message: faker.lorem.sentence(),
                        type: "text",
                        avatar: faker.image.avatar(),
                    },
                    {
                        headers: {
                            "Content-Type": "application/json",
                            "Qiscus-App-Id": appConfig.appId,
                        },
                    }
                )
                .then((raw) => raw.data);

            results.push(res.data.room_log);
        }

        return NextResponse.json({ status: 200, message: `success initiate ${qty} bulk tests`, payload: results }, { status: 200 });
    } catch (error) {
        console.error(error);
        return NextResponse.json(
            {
                status: 500,
                errors: {
                    message: "failed to iniaite bulk test",
                },
            },
            { status: 500 }
        );
    }
}
