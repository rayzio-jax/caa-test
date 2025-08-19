import appConfig from "@/lib/config";
import { insertRoom } from "@/lib/rooms";
import { parseStringify, responsePayload } from "@/lib/utils";
import axios from "axios";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
    try {
        const data = await req.json();

        console.log("================NEW CUSTOMER================");

        const {
            channel: { id: channel_id },
            room_id,
            candidate_agent,
        } = data;

        console.log(parseStringify({ channel_id, room_id, candidate_agent: { id: candidate_agent.id, name: candidate_agent.name, email: candidate_agent.email } }));

        const res = await axios.get(`${appConfig.qiscusApiURL}/v2/admin/service/available_agents`, {
            params: {
                room_id,
            },
            headers: {
                Authorization: appConfig.qiscusAdminToken,
                "Qiscus-App-Id": appConfig.qiscusAppId,
            },
        });

        const agents: [any] = res.data.data.agents;
        const availableAgents = agents
            .filter((agent) => agent.is_available && agent.current_customer_count < appConfig.maxCustomers)
            .map(({ id, email, name, current_customer_count }) => ({
                id,
                email,
                name,
                customerCount: current_customer_count,
            }));

        if (availableAgents.length > 0) {
            console.log("================AVAILABLE AGENTS================");
            console.log(availableAgents);
        }

        if (availableAgents.length > 0) {
            const { id: agent_id } = availableAgents[0];
            await axios.post(
                `${appConfig.qiscusApiURL}/v1/admin/service/assign_agent`,
                {
                    room_id,
                    agent_id,
                    replace_latest_agent: false,
                    max_agent: 1,
                },
                {
                    headers: {
                        "Content-Type": "application/x-www-form-urlencoded",
                        "Qiscus-Secret-Key": appConfig.qiscusKey,
                        "Qiscus-App-Id": appConfig.qiscusAppId,
                    },
                }
            );

            const newRoom = await insertRoom({ room_id, channel_id, agent_id, status: "HANDLED" });
            console.log("================NEW ROOM================");
            console.log(newRoom[0]);
            return NextResponse.json({ status: "ok", message: `agent ${candidate_agent.email}:${candidate_agent.id}` }, { status: 200 });
        }

        const newRoom = await insertRoom({ room_id, channel_id });
        console.log("================NEW ROOM================");
        console.log(newRoom[0]);
        return NextResponse.json({ status: "ok", message: `no agent assigned, room '${room_id}' is on QUEUE` }, { status: 200 });
    } catch (error) {
        console.error("Failed to fetch agents", error);
        return responsePayload("error", "internal server error, check config", {}, 500);
    }
}
