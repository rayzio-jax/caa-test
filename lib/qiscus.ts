"use server";

import appConfig from "./config";
import { parseStringify } from "./utils";

const MAX_CUSTOMER = appConfig.agentMaxCustomer;

/**
 * Gets the list of available agents for a room.
 *
 * @returns {Promise<{ online: Agent[]; offline: Agent[] }>} A promise that resolves to a list of available agents.
 */
export const getAgents = async (): Promise<{ data?: any[]; errors?: any; status?: number; meta?: any }> => {
    try {
        const res = await fetch(`${appConfig.apiUrl}/v2/admin/agents/by_division?division_ids[]=${appConfig.agentDivisionId}`, {
            method: "GET",
            headers: {
                "Qiscus-Secret-Key": appConfig.secretKey,
                "Qiscus-App-Id": appConfig.appId,
            },
            next: {
                revalidate: 60,
            },
        }).then((raw) => raw.json());

        return parseStringify(res);
    } catch (error) {
        console.error(error, "Failed to fetch available agents");
        return { errors: error, status: 500 };
    }
};

export const getFilteredAgents = async (): Promise<FilteredAgents> => {
    try {
        const agents = await getAgents();

        if (!agents.data) {
            return { online: { agents: [], count: 0 }, offline: { agents: [], count: 0 } };
        }

        const onlineAgents = agents.data.filter((agent) => agent.is_available && agent.current_customer_count < MAX_CUSTOMER);
        const offlineAgents = agents.data.filter((agent) => !agent.is_available);

        return { online: { agents: onlineAgents, count: onlineAgents.length }, offline: { agents: offlineAgents, count: offlineAgents.length } };
    } catch (error) {
        console.error("Failed to get filtered agents");
        return { online: { agents: [], count: 0 }, offline: { agents: [], count: 0 } };
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

        const res = await fetch(`${appConfig.apiUrl}/v1/admin/service/assign_agent`, {
            method: "POST",
            headers: {
                "Qiscus-Secret-Key": appConfig.secretKey,
                "Qiscus-App-Id": appConfig.appId,
            },
            body: JSON.stringify({
                room_id: roomId,
                agent_id: agentId,
                replace_latest_agent: false,
                max_agent: 1,
            }),
        }).then((raw) => raw.json());

        return parseStringify(res);
    } catch (error) {
        console.error(error, "Failed to assign an agent");
    }
};
