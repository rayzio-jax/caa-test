import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import appConfig from "./config";

// Tune Neon connection pool
const pool = new Pool({
    connectionString: appConfig.dbUrl,
    max: 20, // Max connections; adjust based on Neon's limits (e.g., 20-50 for standard plans)
    min: 5, // Minimum idle connections to keep open
    idleTimeoutMillis: 30000, // Close idle connections after 30s
    connectionTimeoutMillis: 2000, // Timeout for acquiring a connection
    maxUses: 7500, // Max queries per connection before recycling
    statement_timeout: 5000, // Timeout for individual queries (5s)
});

// Connect database pool into drizzle ORM & export it for global use
export const db = drizzle({ client: pool });
