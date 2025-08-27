"use server";

import axios from "axios";
import appConfig from "./config";
import { getHandledRooms } from "./rooms";
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

        const availableAgents: Agent[] = agents.data.filter((agent) => agent.is_available);
        let onlineAgents: Agent[] = [];
        for (const agent of availableAgents) {
            const handledRooms = (await getHandledRooms(agent.id)).length;

            if (handledRooms < MAX_CUSTOMER) {
                console.log(`ℹ️ Agent ${agent.name} available, load: ${handledRooms}`);
                onlineAgents.push(agent);
            }
        }

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

        console.log(`✔ Agent ${agent.id}/${agent.name} has assigned to room ${room.room_id}`);
        return parseStringify(res.data);
    } catch (error: any) {
        if (error.response) {
            console.error(`${error.response.statusText} [${error.response.status}]: ${error.response.data.errors.message}`);
        } else {
            throw error;
        }
    }
};
