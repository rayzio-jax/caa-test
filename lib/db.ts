import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import appConfig from "./config";

// Initiate connection to database
const pool = new Pool({
    connectionString: appConfig.dbUrl,
});

// Connect database pool into drizzle ORM & export it for global use
export const db = drizzle({ client: pool });
