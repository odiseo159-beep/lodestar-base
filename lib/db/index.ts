import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is not set");
}

/**
 * Supabase pgBouncer in transaction mode does NOT support prepared statements.
 * `prepare: false` is mandatory to avoid runtime errors on the pooler.
 */
const queryClient = postgres(connectionString, {
  prepare: false,
  max: 5,
});

export const db = drizzle(queryClient, { schema });
export { schema };
