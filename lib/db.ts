import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

// Initiate connection to database
const pool = new Pool({
    connectionString: process.env.DATABASE_URL!,
});

// Connect database pool into drizzle ORM & export it for global use
export const db = drizzle({ client: pool });
