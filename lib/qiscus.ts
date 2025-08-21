"use server";

import axios from "axios";
import appConfig from "./config";
import { parseStringify } from "./utils";
import { redis } from "./redis";

interface AdminToken {
    accessToken: string;
    expiresAt: number;
}

const EXPIRES_AT = 12 * 60 * 60;

export const authAdmin = async () => {
    try {
        const res = await axios.post(`${appConfig.qiscusApiURL}/api/v1/auth`, {
            email: appConfig.qiscusAdminMail,
            password: appConfig.qiscusAdminPass,
        });

        const user = await res.data.data.user;
        const accessToken = user.authentication_token;

        const tokenData: AdminToken = {
            accessToken,
            expiresAt: Date.now() + EXPIRES_AT * 1000,
        };

        await redis.set("qiscus:admin_token", JSON.stringify(tokenData), "EX", EXPIRES_AT);

        return accessToken;
    } catch (error) {
        console.error("Failed to authenticate with Qiscus:", error);
        throw new Error("Authentication failed");
    }
};

/**
 * Gets the list of available agents for a room.
 *
 * @param {Object} params - Parameters object.
 * @param {string} params.room_id - The room ID.
 * @param {Object<string, number>} [params.agentLoads] - Optional map of agent IDs to their current load.
 * @returns {Promise<Agent[]>} A promise that resolves to a list of available agents.
 */
export const getAvailableAgents = async ({ roomId }: { roomId: string }): Promise<Agent[]> => {
    try {
        // Retrieve token from Redis
        const tokenDataRaw = await redis.get("qiscus:admin_token");
        let tokenData: AdminToken | null = tokenDataRaw ? JSON.parse(tokenDataRaw) : null;

        // Check if token is missing or expired
        if (!tokenData || Date.now() >= tokenData.expiresAt) {
            console.log("Token missing or expired, re-authenticating...");
            const newToken = await authAdmin();
            tokenData = {
                accessToken: newToken,
                expiresAt: Date.now() + EXPIRES_AT * 1000, // Adjust based on API
            };
        }

        const res = await axios
            .get(`${appConfig.qiscusApiURL}/v2/admin/service/available_agents`, {
                params: {
                    room_id: roomId,
                },
                headers: {
                    Authorization: tokenData.accessToken,
                    "Qiscus-App-Id": appConfig.qiscusAppId,
                },
            })
            .then((raw) => raw.data);

        const agents: any[] = (await res.data.agents) || [];

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
