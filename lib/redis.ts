import Redis from "ioredis";
import appConfig from "./config";
import { assignAgent } from "./qiscus";
import { updateRoomStatus } from "./rooms";

const redis = new Redis(appConfig.redisUrl, {
    tls: process.env.REDIS_URL!.startsWith("rediss://") ? {} : undefined,
    reconnectOnError: (err) => {
        console.error("Redis connection error:", err);
        return true;
    },
    retryStrategy: (times) => Math.min(times * 500, 3000),
});

export async function canDebounced(lockId: string, windowSeconds: number) {
    // SET lockId value NX (if not exists) with EX (expire in N seconds)
    const result = await redis.set(lockId, Date.now(), "PX", windowSeconds, "NX");

    // result === "OK" if lock was acquired
    return result === "OK";
}

export async function tryAssignAgent(roomId: string, candidateAgent: Agent): Promise<boolean> {
    const agentKey = `agent:${candidateAgent.id}:load`;

    const currentLoad = Number(await redis.get(agentKey)) || 0;

    if (currentLoad >= appConfig.maxCustomers) {
        console.log(`⚠️ Agent ${candidateAgent.id} is at capacity (${currentLoad}), skipping...`);
        return false;
    }

    // Atomically increment in Redis
    const newLoad = await redis.incr(agentKey);

    if (newLoad > appConfig.maxCustomers) {
        // rollback if we overshot
        await redis.decr(agentKey);
        console.log(`⚠️ Agent ${candidateAgent.id} reached max capacity, rolled back`);
        return false;
    }

    await assignAgent({ roomId, agentId: candidateAgent.id });
    await updateRoomStatus({ roomId, agentId: candidateAgent.id, status: "HANDLED" });
    console.log(`✅ Assigned agent ${candidateAgent.id} to room ${roomId}`);
    return true;
}
