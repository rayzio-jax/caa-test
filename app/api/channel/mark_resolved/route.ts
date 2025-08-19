import appConfig from "@/lib/config";
import { getQueueRooms, updateRoomStatus } from "@/lib/rooms";
import { responsePayload } from "@/lib/utils";
import axios from "axios";

export async function POST(req: Request) {
    try {
        const data = await req.json();

        console.log("================MARK AS RESOLVED================");
        const {
            resolved_by: { id: agent_id },
            service: { room_id },
        } = data;

        const resolved = await updateRoomStatus({ room_id, agent_id, status: "RESOLVED" });
        console.log(resolved[0]);

        const queueRooms: Rooms[] = await getQueueRooms();

        if (queueRooms.length > 0) {
            console.log("================ON QUEUE ROOMS================");
            console.log(queueRooms);
        }

        for (let i = 0; i < queueRooms.length; i++) {
            const res = await axios.get(`${appConfig.qiscusApiURL}/v2/admin/service/available_agents`, {
                params: {
                    room_id: queueRooms[0].room_id,
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

                const handledRoomId = queueRooms[0].room_id;
                const handledAgentId = availableAgents[0].id;
                await axios.post(
                    `${appConfig.qiscusApiURL}/v1/admin/service/assign_agent`,
                    {
                        room_id: handledRoomId,
                        agent_id: handledAgentId,
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

                const handled = await updateRoomStatus({ room_id: handledRoomId, agent_id, status: "HANDLED" });
                console.log(`================AGENT ${agent_id} HANDLE ON ROOM ${handledRoomId}================`);
                console.log(handled[0]);
            } else {
                break;
            }
        }

        return responsePayload("ok", `success mark as resolved room ${room_id}`, {}, 200);
    } catch (error) {
        console.error("Failed to mark resolved room", error);
        return responsePayload("error", "internal server error", {}, 500);
    }
}
