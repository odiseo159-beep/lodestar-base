import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { searches } from "@/lib/db/schema";
import { desc, eq } from "drizzle-orm";
import SearchClient from "./search-client";

export const dynamic = "force-dynamic";

export default async function Home() {
  const session = await auth();

  let recent: { query: string; createdAt: string }[] = [];
  if (session?.user?.id) {
    const rows = await db
      .select({ query: searches.query, createdAt: searches.createdAt })
      .from(searches)
      .where(eq(searches.userId, session.user.id))
      .orderBy(desc(searches.createdAt))
      .limit(8);
    recent = rows.map((r) => ({
      query: r.query,
      createdAt: r.createdAt.toISOString(),
    }));
  }

  return <SearchClient session={session} recentSearches={recent} />;
}
