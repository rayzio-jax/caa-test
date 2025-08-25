import { defineConfig } from "drizzle-kit";
import appConfig from "./lib/config";

export default defineConfig({
    out: "./drizzle",
    schema: "./lib/schema.ts",
    dialect: "postgresql",
    dbCredentials: {
        url: appConfig.dbUrl,
    },
});
