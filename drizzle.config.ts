import type { Config } from "drizzle-kit";

export default {
  schema: "./lib/db/schema.ts",
  out: "./lib/db/migrations",
  dialect: "postgresql",
  dbCredentials: {
    // Only required for push/pull/migrate (not for generate)
    url: process.env.DATABASE_URL ?? "",
  },
  strict: true,
  verbose: true,
} satisfies Config;
