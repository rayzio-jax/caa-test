import Redis from "ioredis";
import appConfig from "./config";

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
