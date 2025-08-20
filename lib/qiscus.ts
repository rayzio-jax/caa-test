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
export const getAvailableAgents = async ({ room_id, agentLoads }: { room_id: string; agentLoads?: Record<string, number> }): Promise<Agent[]> => {
    const res = await axios.get(`${appConfig.qiscusApiURL}/v2/admin/service/available_agents`, {
        params: {
            room_id: room_id,
        },
        headers: {
            Authorization: appConfig.qiscusAdminToken,
            "Qiscus-App-Id": appConfig.qiscusAppId,
        },
    });

    const agents: any[] = res.data.data.agents || [];

    const availableAgents = agents
        .filter((agent) => {
            const liveCount = Number(agent.current_customer_count) || 0;
            const localCount = agentLoads?.[agent.id] || 0;
            const totalCount = liveCount + localCount;

            return agent.is_available && totalCount < appConfig.maxCustomers;
        })
        .map(({ id, email, name, current_customer_count }) => ({
            id,
            email,
            name,
            customerCount: Number(current_customer_count),
        }));

    return parseStringify(availableAgents);
};

/**
 * Assigns an agent to a room.
 *
 * @param {Object} params - Parameters object.
 * @param {string} params.room_id - The ID of the room to assign the agent to.
 * @param {string} params.agent_id - The ID of the agent being assigned.
 */

export const assignAgent = async ({ room_id, agent_id }: { room_id: string; agent_id: string }) => {
    await axios.post(
        `${appConfig.qiscusApiURL}/v1/admin/service/assign_agent`,
        {
            room_id: room_id,
            agent_id: agent_id,
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
};
