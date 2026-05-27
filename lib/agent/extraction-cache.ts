import { and, eq, gte, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { reposCache } from "@/lib/db/schema";
import type { ExtractedMetadata, UnifiedItem } from "@/lib/sources/types";

const CACHE_TTL_DAYS = 7;
const CACHE_TTL_MS = CACHE_TTL_DAYS * 24 * 60 * 60 * 1000;

type CachedPayload = {
  extracted?: ExtractedMetadata;
};

/**
 * Look up cached LLM extractions in repos_cache (per source × sourceId).
 * Returns a Map keyed by `${source}:${sourceId}`.
 *
 * Stale entries (>7 days) are skipped — the LLM will re-extract them.
 */
export async function loadCachedExtractions(
  items: UnifiedItem[]
): Promise<Map<string, ExtractedMetadata>> {
  if (items.length === 0) return new Map();

  const sources = [...new Set(items.map((it) => it.source))];
  const sourceIds = items.map((it) => it.externalId);
  const cutoff = new Date(Date.now() - CACHE_TTL_MS);

  const rows = await db
    .select()
    .from(reposCache)
    .where(
      and(
        inArray(reposCache.source, sources),
        inArray(reposCache.sourceId, sourceIds),
        gte(reposCache.fetchedAt, cutoff)
      )
    );

  const cache = new Map<string, ExtractedMetadata>();
  for (const row of rows) {
    const payload = row.data as CachedPayload | null;
    if (payload?.extracted) {
      cache.set(`${row.source}:${row.sourceId}`, payload.extracted);
    }
  }
  return cache;
}

/**
 * Persist LLM extractions for the items that just got enriched. Upserts
 * one row per item; failures are logged but don't break the request.
 */
export async function saveExtractions(items: UnifiedItem[]): Promise<void> {
  const toUpsert = items
    .filter((it) => !!it.extracted)
    .map((it) => ({
      source: it.source,
      sourceId: it.externalId,
      fullName: it.title.slice(0, 200),
      data: { extracted: it.extracted } as Record<string, unknown>,
      fetchedAt: new Date(),
    }));

  if (toUpsert.length === 0) return;

  await Promise.all(
    toUpsert.map((row) =>
      db
        .insert(reposCache)
        .values(row)
        .onConflictDoUpdate({
          target: [reposCache.source, reposCache.sourceId],
          set: {
            fullName: row.fullName,
            data: row.data,
            fetchedAt: row.fetchedAt,
          },
        })
        .catch((err) => {
          console.error(
            `Cache upsert failed for ${row.source}:${row.sourceId}:`,
            err
          );
        })
    )
  );
}

// Touch eq to keep TS happy (used indirectly by drizzle)
void eq;
