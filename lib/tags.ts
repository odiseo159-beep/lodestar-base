import type { UnifiedItem } from "@/lib/sources/types";

/**
 * Pre-defined categories shown on the hero / empty state.
 * Each chip seeds the search input with a useful query.
 */
export type HeroChip = { label: string; query: string };
export type HeroCategory = { title: string; chips: HeroChip[] };

export const HERO_CATEGORIES: HeroCategory[] = [
  {
    title: "chain",
    chips: [
      { label: "base", query: "base agent" },
      { label: "ethereum", query: "ethereum L2 agent" },
      { label: "solana", query: "solana agent" },
      { label: "arbitrum", query: "arbitrum stylus" },
      { label: "optimism", query: "optimism superchain" },
    ],
  },
  {
    title: "ai tech",
    chips: [
      { label: "claude", query: "claude agent skill" },
      { label: "mcp", query: "mcp server" },
      { label: "hermes", query: "hermes function calling" },
      { label: "langchain", query: "langchain agent" },
      { label: "agent sdk", query: "agent sdk typescript" },
      { label: "claude code", query: "claude code agent" },
    ],
  },
  {
    title: "kind",
    chips: [
      { label: "agent", query: "autonomous ai agent" },
      { label: "defi", query: "defi protocol" },
      { label: "wallet", query: "smart wallet" },
      { label: "frame", query: "farcaster frame" },
      { label: "x402", query: "x402 payment" },
      { label: "identity", query: "onchain identity" },
    ],
  },
  {
    title: "stage",
    chips: [
      { label: "hackathon", query: "hackathon weekend project" },
      { label: "production", query: "production-grade onchain tool" },
    ],
  },
];

// ────────────────────────────────────────────────────────────────────────────
// Facet extraction — runs over the items already on screen and produces
// counted chips for client-side filtering.
// ────────────────────────────────────────────────────────────────────────────

const CHAIN_KEYWORDS = [
  "base",
  "ethereum",
  "solana",
  "arbitrum",
  "optimism",
  "polygon",
  "starknet",
  "zksync",
  "linea",
];

const AI_TECH_KEYWORDS = [
  "claude",
  "anthropic",
  "gpt",
  "openai",
  "mcp",
  "hermes",
  "langchain",
  "llama",
  "mistral",
  "agent sdk",
  "vercel ai",
];

const SOURCE_LABEL: Record<string, string> = {
  github: "github",
  hn: "hn",
  reddit: "reddit",
};

/**
 * One filter scoped to a facet category. `category:value` is the canonical key.
 */
export type FacetKey = string; // `${category}:${value}`

export type FacetCategory =
  | "source"
  | "maturity"
  | "stack"
  | "chain"
  | "ai"
  | "onchain";

export type Facet = {
  category: FacetCategory;
  value: string;
  count: number;
};

/**
 * Detect which chains / AI tech / kinds an item references by scanning its
 * textual surface (title + description + topics + extracted stack).
 */
export function extractTagsFromItem(item: UnifiedItem): {
  chains: string[];
  aiTech: string[];
} {
  const haystack = [
    item.title,
    item.description ?? "",
    ...(item.topics ?? []),
    ...(item.extracted?.stack ?? []),
    item.extracted?.purpose ?? "",
  ]
    .join(" ")
    .toLowerCase();

  // Word-boundary-ish: surround with spaces so "base" doesn't match "database"
  const hay = ` ${haystack.replace(/[^\w\s-]/g, " ")} `;

  return {
    chains: CHAIN_KEYWORDS.filter((k) => hay.includes(` ${k} `)),
    aiTech: AI_TECH_KEYWORDS.filter((k) => hay.includes(` ${k} `)),
  };
}

/**
 * Compute available facets from a result set, sorted by count desc within
 * each category. Each category caps at N values to keep the UI tight.
 */
export function computeFacets(items: UnifiedItem[]): Record<
  FacetCategory,
  Facet[]
> {
  const counts: Record<FacetCategory, Map<string, number>> = {
    source: new Map(),
    maturity: new Map(),
    stack: new Map(),
    chain: new Map(),
    ai: new Map(),
    onchain: new Map(),
  };

  for (const item of items) {
    const src = SOURCE_LABEL[item.source] ?? item.source;
    counts.source.set(src, (counts.source.get(src) ?? 0) + 1);

    if (item.extracted?.maturity) {
      counts.maturity.set(
        item.extracted.maturity,
        (counts.maturity.get(item.extracted.maturity) ?? 0) + 1
      );
    }

    for (const tech of item.extracted?.stack ?? []) {
      counts.stack.set(tech, (counts.stack.get(tech) ?? 0) + 1);
    }

    const tags = extractTagsFromItem(item);
    for (const c of tags.chains) {
      counts.chain.set(c, (counts.chain.get(c) ?? 0) + 1);
    }
    for (const a of tags.aiTech) {
      counts.ai.set(a, (counts.ai.get(a) ?? 0) + 1);
    }

    if (item.creator?.hasBasePresence) {
      counts.onchain.set("on base", (counts.onchain.get("on base") ?? 0) + 1);
    }
  }

  const sorted = (map: Map<string, number>, limit?: number) =>
    [...map.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit ?? 999)
      .map(([value, count]) => ({ category: "source" as FacetCategory, value, count }));

  return {
    source: sorted(counts.source).map((f) => ({ ...f, category: "source" })),
    maturity: sorted(counts.maturity).map((f) => ({
      ...f,
      category: "maturity",
    })),
    stack: sorted(counts.stack, 10).map((f) => ({ ...f, category: "stack" })),
    chain: sorted(counts.chain).map((f) => ({ ...f, category: "chain" })),
    ai: sorted(counts.ai).map((f) => ({ ...f, category: "ai" })),
    onchain: sorted(counts.onchain).map((f) => ({ ...f, category: "onchain" })),
  };
}

/**
 * Apply the active filters to an items array.
 *
 * Filter semantics:
 *   - Across categories: AND  (every active category must match)
 *   - Within a category: OR   (any selected value in that category passes)
 */
export function applyFilters(
  items: UnifiedItem[],
  activeKeys: Set<FacetKey>
): UnifiedItem[] {
  if (activeKeys.size === 0) return items;

  const byCategory = new Map<FacetCategory, Set<string>>();
  for (const key of activeKeys) {
    const sep = key.indexOf(":");
    if (sep < 0) continue;
    const cat = key.slice(0, sep) as FacetCategory;
    const value = key.slice(sep + 1);
    if (!byCategory.has(cat)) byCategory.set(cat, new Set());
    byCategory.get(cat)!.add(value);
  }

  return items.filter((item) => {
    for (const [cat, values] of byCategory) {
      let matches = false;
      switch (cat) {
        case "source":
          matches = values.has(item.source);
          break;
        case "maturity":
          matches = !!(
            item.extracted?.maturity && values.has(item.extracted.maturity)
          );
          break;
        case "stack":
          matches = !!item.extracted?.stack?.some((s) => values.has(s));
          break;
        case "chain": {
          const tags = extractTagsFromItem(item);
          matches = tags.chains.some((c) => values.has(c));
          break;
        }
        case "ai": {
          const tags = extractTagsFromItem(item);
          matches = tags.aiTech.some((a) => values.has(a));
          break;
        }
        case "onchain":
          matches = !!item.creator?.hasBasePresence;
          break;
      }
      if (!matches) return false;
    }
    return true;
  });
}
