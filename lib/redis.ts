import Redis from "ioredis";
import appConfig from "./config";
import { assignAgent } from "./qiscus";
import { insertRoom, updateRoomStatus } from "./rooms";

export const redis = new Redis(appConfig.redisUrl, {
    tls: process.env.REDIS_URL!.startsWith("rediss://") ? {} : undefined,
    reconnectOnError: (err) => {
        console.error("Redis connection error:", err);
        return true;
    },
    retryStrategy: (times) => Math.min(times * 500, 3000),
});

export async function canDebounced(lockId: string, windwowMs: number) {
    // SET lockId value NX (if not exists) with EX (expire in N seconds)
    const result = await redis.set(lockId, Date.now(), "PX", windwowMs, "NX");

    // result === "OK" if lock was acquired
    return result === "OK";
}

export async function tryAssignAgent({ type, roomId, channelId, agent }: { type: "new" | "update"; roomId: string; channelId: string; agent: Agent }): Promise<boolean> {
    const agentKey = `agent:${agent.id}:load`;

    const currentLoad = Number(await redis.get(agentKey)) || 0;

    if (currentLoad >= appConfig.maxCustomers) {
        await redis.decr(agentKey);
        return false;
    }

    await redis.incr(agentKey);

    if (type === "new") {
        await assignAgent({ roomId, agentId: agent.id });
        await insertRoom({ roomId, channelId, agentId: agent.id, status: "HANDLED" });
        console.log(`✅ Assigned agent ${agent.id} to room ${roomId}`);
    } else if (type === "update") {
        await assignAgent({ roomId, agentId: agent.id });
        await updateRoomStatus({ roomId, channelId, agentId: agent.id, status: "HANDLED" });
        console.log(`✅ Assigned agent ${agent.id} to room ${roomId}`);
    } else {
        console.log(`⚠️ Agent ${agent.id} has reached max capacity (${currentLoad})`);
    }

    return true;
}

export async function resolveRoom({ roomId, channelId, agentId }: { roomId: string; channelId: string; agentId: string }) {
    await updateRoomStatus({ roomId, channelId, agentId, status: "RESOLVED" });

    const agentKey = `agent:${agentId}:load`;

    const newLoad = await redis.decr(agentKey);
    if (newLoad < 0) {
        // safety: never go below 0
        await redis.set(agentKey, 0);
    }

    console.log(`🟢 Room ${roomId} resolved, agent ${agentId} load now ${Math.max(newLoad, 0)}`);
}

export async function resetAgentLoad(agentId: string): Promise<void> {
    const agentKey = `agent:${agentId}:load`;

    try {
        await redis.set(agentKey, 0);
        console.log(`🟢 Agent ${agentId} load reset to 0`);
    } catch (error) {
        console.error(`❌ Failed to reset load for agent ${agentId}:`, error);
        throw error; // Re-throw to allow calling code to handle the error
    }
}
