import { eq, lt } from "drizzle-orm";
import { db } from "@/lib/db";
import { creatorsCache } from "@/lib/db/schema";
import {
  findFarcasterByUsername,
  type FarcasterProfile,
} from "@/lib/sources/farcaster";
import { getBaseStatsForAddresses } from "@/lib/sources/basescan";
import type { UnifiedItem } from "@/lib/sources/types";

/**
 * Enriched view of a GitHub creator we attach to each item.
 */
export type CreatorEnrichment = {
  githubHandle: string;
  farcaster: FarcasterProfile | null;
  base: {
    contractCount: number;
    txCount: number;
    firstTxAt: string | null;
    lastTxAt: string | null;
  };
};

const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 1 day

/**
 * For a list of unified items, enrich those whose source is GitHub by:
 *   1. Looking up the creator on Farcaster (by handle).
 *   2. If found and they have verified addresses, querying Base for activity.
 *
 * Cached per-handle for 24h in `creators_cache` to avoid hammering APIs.
 * The enrichment is attached via item.author and a new field for downstream
 * use (LLM context + UI badges).
 */
export async function enrichGithubCreators(
  items: UnifiedItem[]
): Promise<Map<string, CreatorEnrichment>> {
  const handles = new Set<string>();
  for (const item of items) {
    if (item.source === "github" && item.author.handle) {
      handles.add(item.author.handle.toLowerCase());
    }
  }
  if (handles.size === 0) return new Map();

  // 1. Check cache first
  const handleList = [...handles];
  const cached = await db
    .select()
    .from(creatorsCache);
  const cacheByHandle = new Map(
    cached
      .filter((r) => handleList.includes(r.githubHandle.toLowerCase()))
      .map((r) => [r.githubHandle.toLowerCase(), r])
  );

  const enrichments = new Map<string, CreatorEnrichment>();
  const toFetch: string[] = [];

  for (const handle of handleList) {
    const cachedRow = cacheByHandle.get(handle);
    if (
      cachedRow &&
      Date.now() - new Date(cachedRow.fetchedAt).getTime() < CACHE_TTL_MS
    ) {
      const data = cachedRow.data as Record<string, unknown> | null;
      enrichments.set(handle, {
        githubHandle: handle,
        farcaster: (data?.farcaster as FarcasterProfile | null) ?? null,
        base: {
          contractCount: cachedRow.baseContractCount ?? 0,
          txCount: cachedRow.baseTxCount ?? 0,
          firstTxAt: (data?.firstTxAt as string | null) ?? null,
          lastTxAt: (data?.lastTxAt as string | null) ?? null,
        },
      });
    } else {
      toFetch.push(handle);
    }
  }

  // 2. Fetch missing — Farcaster lookups, capped concurrency (Neynar free
  //    tier is ~5 req/s and bursts of 8+ get a 429 back). On transient
  //    errors we mark the slot so we don't cache "no match" by accident.
  const fcResults = await limitedParallel(
    toFetch,
    async (handle) => {
      try {
        const fc = await findFarcasterByUsername(handle);
        return { handle, fc, transientError: false };
      } catch (err) {
        console.error(`Skip cache for ${handle}:`, err);
        return { handle, fc: null, transientError: true };
      }
    },
    3
  );

  // 3. For Farcaster matches with verified addresses, fetch Base stats
  //    (also throttled — Basescan free tier is 5 req/s).
  const baseResults = await limitedParallel(
    fcResults,
    async ({ handle, fc, transientError }) => {
      if (!fc || fc.verifiedEthAddresses.length === 0) {
        return {
          handle,
          fc,
          transientError,
          base: {
            contractCount: 0,
            txCount: 0,
            firstTxAt: null,
            lastTxAt: null,
          },
        };
      }
      const base = await getBaseStatsForAddresses(fc.verifiedEthAddresses);
      return { handle, fc, transientError, base };
    },
    3
  );

  // 4. Write back to cache and to the in-memory map.
  //    Skip caching rows where the Neynar call hit a transient error —
  //    otherwise we'd memoize "no FC match" wrongly for 24h.
  const upserts: Array<{
    githubHandle: string;
    farcasterFid: number | null;
    farcasterUsername: string | null;
    verifiedAddresses: string[];
    baseContractCount: number;
    baseTxCount: number;
    data: Record<string, unknown>;
    fetchedAt: Date;
  }> = [];

  for (const { handle, fc, base, transientError } of baseResults) {
    const enrichment: CreatorEnrichment = {
      githubHandle: handle,
      farcaster: fc,
      base,
    };
    enrichments.set(handle, enrichment);
    if (transientError) continue; // don't cache transient failures
    upserts.push({
      githubHandle: handle,
      farcasterFid: fc?.fid ?? null,
      farcasterUsername: fc?.username ?? null,
      verifiedAddresses: fc?.verifiedEthAddresses ?? [],
      baseContractCount: base.contractCount,
      baseTxCount: base.txCount,
      data: {
        farcaster: fc,
        firstTxAt: base.firstTxAt,
        lastTxAt: base.lastTxAt,
      },
      fetchedAt: new Date(),
    });
  }

  if (upserts.length > 0) {
    // Upsert one by one (Drizzle's onConflictDoUpdate handles existing rows)
    await Promise.all(
      upserts.map((row) =>
        db
          .insert(creatorsCache)
          .values(row)
          .onConflictDoUpdate({
            target: creatorsCache.githubHandle,
            set: {
              farcasterFid: row.farcasterFid,
              farcasterUsername: row.farcasterUsername,
              verifiedAddresses: row.verifiedAddresses,
              baseContractCount: row.baseContractCount,
              baseTxCount: row.baseTxCount,
              data: row.data,
              fetchedAt: row.fetchedAt,
            },
          })
          .catch((err) => {
            console.error(`Failed to upsert creator ${row.githubHandle}:`, err);
          })
      )
    );
  }

  return enrichments;
}

/**
 * Garbage collect very old cache rows (best-effort, fire-and-forget).
 */
export async function pruneCreatorsCache(): Promise<void> {
  const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  await db.delete(creatorsCache).where(lt(creatorsCache.fetchedAt, cutoff));
}

// Avoid unused import warning when eq is only used via Drizzle helpers indirectly.
void eq;

/**
 * Run `fn` over `items` with a max of `concurrency` in flight at once.
 * Preserves input ordering in the result array.
 */
async function limitedParallel<T, R>(
  items: T[],
  fn: (item: T) => Promise<R>,
  concurrency: number
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let idx = 0;
  async function worker() {
    while (true) {
      const myIdx = idx++;
      if (myIdx >= items.length) return;
      results[myIdx] = await fn(items[myIdx]);
    }
  }
  const workers = Array.from(
    { length: Math.min(concurrency, items.length) },
    () => worker()
  );
  await Promise.all(workers);
  return results;
}
