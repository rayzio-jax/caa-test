"use server";

import axios from "axios";
import appConfig from "./config";
import { parseStringify } from "./utils";
import { redis } from "./redis";

/**
 * Gets the list of available agents for a room.
 *
 * @param {Object} params - Parameters object.
 * @param {string} params.room_id - The room ID.
 * @param {Object<string, number>} [params.agentLoads] - Optional map of agent IDs to their current load.
 * @returns {Promise<Agent[]>} A promise that resolves to a list of available agents.
 */
export const getAvailableAgents = async ({ roomId }: { roomId: number }): Promise<Agent[]> => {
    try {
        const res = await axios.get(`${appConfig.qiscusApiURL}/v2/admin/service/available_agents`, {
            params: {
                room_id: roomId,
            },
            headers: {
                Authorization: appConfig.qiscusAdminToken,
                "Qiscus-App-Id": appConfig.qiscusAppId,
            },
        });

        const agents: any[] = (await res.data.data.agents) || [];

        // Fetch current loads from Redis
        const redisKeys = agents.map((agent) => `agent:${agent.id}:load`);
        const redisCounts = await redis.mget(...redisKeys); // returns array of strings | null

        const availableAgents = agents
            .filter((agent, index) => {
                const liveCount = Number(agent.current_customer_count) || 0;
                const redisCount = Number(redisCounts[index] || 0); // load from Redis
                const totalCount = liveCount + redisCount;

                return agent.is_available && totalCount < appConfig.maxCustomers;
            })
            .map(({ id, email, name, current_customer_count }) => ({
                id,
                email,
                name,
                customerCount: Number(current_customer_count),
            }));

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

export const assignAgent = async ({ roomId, agentId }: { roomId: number; agentId: number }) => {
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
