"use server";

import axios from "axios";
import appConfig from "./config";
import { parseStringify } from "./utils";

/**
 * Gets the list of available agents for a room.
 *
 * @returns {Promise<{ online: Agent[]; offline: Agent[] }>} A promise that resolves to a list of available agents.
 */
export const getAgents = async (): Promise<{ online: Agent[]; offline: Agent[] }> => {
    try {
        const res = await axios
            .get(`${appConfig.qiscusApiURL}/v2/admin/agents`, {
                headers: {
                    "Qiscus-Secret-Key": appConfig.qiscusKey,
                    "Qiscus-App-Id": appConfig.qiscusAppId,
                },
            })
            .then((raw) => raw.data);

        const agents: any[] = (await res.data.agents) || [];
        const availableAgents: Agent[] = agents.filter((agent) => agent.is_available);
        const unavailableAgents: Agent[] = agents.filter((agent) => !agent.is_available);

        return parseStringify({
            online: availableAgents,
            offline: unavailableAgents,
        });
    } catch (error) {
        console.error(error, "Failed to fetch available agents");
        return { online: [], offline: [] };
    }
};

/**
 * Assigns an agent to a room.
 *
 * @param {Object} params - Parameters object.
 * @param {string} params.roomId - The ID of the room to assign the agent to.
 * @param {string} params.agentId - The ID of the agent being assigned.
 */

export const assignAgent = async ({ roomId, agentId }: { roomId: string; agentId: string }) => {
    try {
        if (!roomId || !agentId) throw new Error("roomId or agentId is empty.");

        await axios
            .post(
                `${appConfig.qiscusApiURL}/v1/admin/service/assign_agent`,
                {
                    room_id: roomId,
                    agent_id: agentId,
                    replace_latest_agent: false,
                    max_agent: 1,
                },
                {
                    headers: {
                        "Qiscus-Secret-Key": appConfig.qiscusKey,
                        "Qiscus-App-Id": appConfig.qiscusAppId,
                    },
                }
            )
            .then((raw) => raw.data);
    } catch (error) {
        console.error(error, "Failed to assign an agent");
    }
};
