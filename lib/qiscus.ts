"use server";

import axios from "axios";
import appConfig from "./config";
import { parseStringify } from "./utils";

/**
 * Gets the list of available agents for a room.
 *
 * @param {Object} params - Parameters object.
 * @param {string} params.room_id - The room ID.
 * @param {Object<string, number>} [params.agentLoads] - Optional map of agent IDs to their current load.
 * @returns {Promise<Agent[]>} A promise that resolves to a list of available agents.
 */
export const getAgents = async (): Promise<Agent[]> => {
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

        return parseStringify(availableAgents);
    } catch (error) {
        console.error(error, "Failed to fetch available agents");
        return [];
    }
};

/**
 * Assigns an agent to a room.
 *
 * @param {Object} params - Parameters object.
 * @param {string} params.room_id - The ID of the room to assign the agent to.
 * @param {string} params.agent_id - The ID of the agent being assigned.
 */

export const assignAgent = async ({ roomId, agentId }: { roomId: string; agentId: string }) => {
    try {
        await axios.post(
            `${appConfig.qiscusApiURL}/v1/admin/service/assign_agent`,
            {
                room_id: roomId,
                agent_id: agentId,
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
    } catch (error) {
        console.error(error, "Failed to assign an agent");
    }
};
