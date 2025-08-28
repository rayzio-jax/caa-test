import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import appConfig from "./config";

// Tune Neon connection pool
const pool = new Pool({
    connectionString: appConfig.dbUrl,
    idleTimeoutMillis: 15000,
    maxUses: 7500,
    statement_timeout: 10000, // Increased for resilience
});

// Connect database pool into drizzle ORM & export it for global use
export const db = drizzle({ client: pool });
