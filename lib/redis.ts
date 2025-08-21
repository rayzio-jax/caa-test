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

export async function tryAssignAgent(type: "new" | "update", roomId: string, agentId: string, channelId?: string): Promise<boolean> {
    const agentKey = `agent:${agentId}:load`;

    const currentLoad = Number(await redis.get(agentKey)) || 0;

    if (currentLoad >= appConfig.maxCustomers) {
        await redis.decr(agentKey);
        return false;
    }

    await redis.incr(agentKey);

    if (type === "new") {
        await assignAgent({ roomId, agentId });
        await insertRoom({ roomId, channelId: channelId as string, agentId, status: "HANDLED" });
        console.log(`✅ Assigned agent ${agentId} to room ${roomId}`);
    } else if (type === "update") {
        await assignAgent({ roomId, agentId: agentId });
        await updateRoomStatus({ roomId, agentId, status: "HANDLED" });
        console.log(`✅ Assigned agent ${agentId} to room ${roomId}`);
    } else {
        console.log(`⚠️ Agent ${agentId} has reached max capacity (${currentLoad})`);
    }

    return true;
}

export async function resolveRoom(roomId: string, agentId: string) {
    await updateRoomStatus({ roomId, agentId, status: "RESOLVED" });

    const agentKey = `agent:${agentId}:load`;

    const newLoad = await redis.decr(agentKey);
    if (newLoad < 0) {
        // safety: never go below 0
        await redis.set(agentKey, 0);
    }

    console.log(`🟢 Room ${roomId} resolved, agent ${agentId} load now ${Math.max(newLoad, 0)}`);
}
