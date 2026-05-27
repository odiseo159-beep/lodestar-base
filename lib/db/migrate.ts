import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");

  const sql = postgres(url, { max: 1, prepare: false });
  const db = drizzle(sql);

  console.log("Running migrations…");
  await migrate(db, { migrationsFolder: "./lib/db/migrations" });
  console.log("Migrations applied.");

  await sql.end();
  process.exit(0);
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
