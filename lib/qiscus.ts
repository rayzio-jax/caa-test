"use server";

import axios from "axios";
import appConfig from "./config";
import { getHandledRooms } from "./rooms";
import { parseStringify } from "./utils";

const MAX_CUSTOMER = appConfig.agentMaxCustomer || 2;

/**
 * Gets the list of available agents for a room.
 *
 * @returns {Promise<{ data?: any[]; errors?: any; status?: number; meta?: any }>} A promise that resolves to a list of available agents.
 */
export const getAgents = async (): Promise<{ data?: any[]; errors?: any; status?: number; meta?: any }> => {
    try {
        const res = await axios
            .get(`${appConfig.apiUrl}/v2/admin/agents/by_division`, {
                params: {
                    "division_ids[]": appConfig.agentDivisionId,
                },
                headers: {
                    "Qiscus-Secret-Key": appConfig.secretKey,
                    "Qiscus-App-Id": appConfig.appId,
                },
            })
            .then((raw) => raw.data);

        return parseStringify(res);
    } catch (error) {
        console.error(error, "Failed to fetch available agents");
        return { errors: error, status: 500 };
    }
};

/**
 * Get agents, filter it based on their availability, and sort `ASC` based on their name
 *
 * @returns {FilteredAgents} List of online and offline agents
 */
export const getFilteredAgents = async (): Promise<FilteredAgents> => {
    try {
        const agents = await getAgents();

        const availableAgents: Agent[] = Array.isArray(agents.data) ? agents.data.filter((agent) => agent.is_available).sort((a: Agent, b: Agent) => a.name.localeCompare(b.name)) : [];

        let resultAgents: Agent[] = [];
        for (const agent of availableAgents) {
            const handledRooms = await getHandledRooms(agent.id);

            if (handledRooms && handledRooms.length < MAX_CUSTOMER) {
                console.log(`❗ Agent ${agent.name} available, load: ${handledRooms}`);
                resultAgents.push({ ...agent, current_customer_count: handledRooms.length });
            }
        }

        return { agents: resultAgents, count: resultAgents.length };
    } catch (error) {
        console.error("Failed to get filtered agents");
        return { agents: [], count: 0 };
    }
};

/**
 * Assigns an agent to a room.
 *
 * @param {Object} params - Parameters object.
 * @param {string} params.roomId - The ID of the room to assign the agent to.
 * @param {string} params.agentId - The ID of the agent being assigned.
 */

export const assignAgent = async ({ roomId, agentId }: { roomId: number; agentId: number }) => {
    if (!roomId || !agentId) {
        throw new Error("Missing 'agentId' or 'roomId'.");
    }

    try {
        const res = await axios
            .post(
                `${appConfig.apiUrl}/v1/admin/service/assign_agent`,
                {
                    room_id: roomId.toString(),
                    agent_id: agentId.toString(),
                    replace_latest_agent: false,
                    max_agent: 1,
                },
                {
                    headers: {
                        "Qiscus-Secret-Key": appConfig.secretKey,
                        "Qiscus-App-Id": appConfig.appId,
                    },
                }
            )
            .then((raw) => raw.data);

        const agent = res.data.added_agent;
        const room = res.data.service;

        console.log(`✓ Agent ${agent.id}/${agent.name} has assigned to room ${room.room_id}`);
        return parseStringify(res.data);
    } catch (error: any) {
        if (error.response) {
            console.error(`${error.response.statusText} [${error.response.status}]: ${error.response.data.errors.message}`);
        } else {
            throw error;
        }
    }
};
