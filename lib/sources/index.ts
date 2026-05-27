import { searchGithubUnified } from "./github";
import { searchHackerNews } from "./hackernews";
import { searchReddit } from "./reddit";
import type { SourceKind, UnifiedItem } from "./types";

export type { UnifiedItem, SourceKind, ExtractedMetadata } from "./types";

const DEFAULT_SOURCES: SourceKind[] = ["github", "hn", "reddit"];

/**
 * Run all (or a subset of) sources in parallel and aggregate into a single
 * de-duplicated list of UnifiedItem.
 *
 * De-dup strategy:
 *   - HN/Reddit posts often link to the same GitHub repo. We collapse to
 *     the GitHub item if present, preserving HN/Reddit signals.
 */
export async function searchAllSources(
  query: string,
  options: {
    sources?: SourceKind[];
    perSourceLimit?: number;
  } = {}
): Promise<UnifiedItem[]> {
  const { sources = DEFAULT_SOURCES, perSourceLimit = 10 } = options;

  const results = await Promise.allSettled(
    sources.map((s) => fetchOne(s, query, perSourceLimit))
  );

  const all: UnifiedItem[] = [];
  for (const r of results) {
    if (r.status === "fulfilled") {
      all.push(...r.value);
    } else {
      console.error("Source failed:", r.reason);
    }
  }

  return dedupeByUrl(all);
}

async function fetchOne(
  source: SourceKind,
  query: string,
  limit: number
): Promise<UnifiedItem[]> {
  switch (source) {
    case "github":
      return searchGithubUnified(query, { limit, recentDays: 365 });
    case "hn":
      return searchHackerNews(query, limit);
    case "reddit":
      return searchReddit(query, limit);
  }
}

/**
 * Collapse duplicates pointing to the same canonical URL (typically
 * github.com/owner/repo). Prefer the GitHub-source entry; merge other
 * sources' signals into it.
 */
function dedupeByUrl(items: UnifiedItem[]): UnifiedItem[] {
  const byKey = new Map<string, UnifiedItem>();

  for (const item of items) {
    const key = canonicalKey(item.url);
    const existing = byKey.get(key);

    if (!existing) {
      byKey.set(key, item);
      continue;
    }

    // Prefer github source as the canonical record; merge others' signals.
    const winner = existing.source === "github" ? existing : item;
    const loser = existing.source === "github" ? item : existing;

    winner.signals = {
      ...winner.signals,
      ...mergeSignalsAdditive(winner.signals, loser.signals),
    };

    // Stash a hint that this was corroborated across sources.
    const extraTopics = new Set([
      ...(winner.topics ?? []),
      `also:${loser.source}`,
    ]);
    winner.topics = [...extraTopics];

    byKey.set(key, winner);
  }

  return [...byKey.values()];
}

function canonicalKey(url: string): string {
  try {
    const u = new URL(url);
    let path = u.pathname.replace(/\/$/, "");
    // Collapse github.com/owner/repo/anything → github.com/owner/repo
    if (u.hostname === "github.com") {
      const parts = path.split("/").filter(Boolean);
      if (parts.length >= 2) {
        path = `/${parts[0]}/${parts[1]}`;
      }
    }
    return `${u.hostname}${path}`.toLowerCase();
  } catch {
    return url.toLowerCase();
  }
}

function mergeSignalsAdditive(
  a: UnifiedItem["signals"],
  b: UnifiedItem["signals"]
): UnifiedItem["signals"] {
  return {
    stars: maxOrUndef(a.stars, b.stars),
    forks: maxOrUndef(a.forks, b.forks),
    points: sumOrUndef(a.points, b.points),
    comments: sumOrUndef(a.comments, b.comments),
  };
}

function maxOrUndef(a?: number, b?: number): number | undefined {
  if (a == null && b == null) return undefined;
  return Math.max(a ?? 0, b ?? 0);
}

function sumOrUndef(a?: number, b?: number): number | undefined {
  if (a == null && b == null) return undefined;
  return (a ?? 0) + (b ?? 0);
}
