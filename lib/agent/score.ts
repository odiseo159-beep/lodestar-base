import type { UnifiedItem } from "@/lib/sources/types";
import type { ProfileAxes } from "@/lib/profile/types";

/**
 * Personalized scoring. Score in [0, 1.5] (uncapped above 1 due to bonuses).
 * Inputs:
 *   - LLM-extracted relevance + novelty
 *   - Onchain enrichment (Farcaster + Base)
 *   - User profile axes
 *
 * Outputs a single number for sorting. Items without any signal land around
 * 0.3-0.4 (mid). Strong matches push past 1.0.
 */
export function scoreItem(item: UnifiedItem, axes: ProfileAxes): number {
  const e = item.extracted;
  const c = item.creator;

  // Base weights (sum to 1 absent any bonuses)
  const W_REL = 0.4;
  const W_NOV = lerp(0.1, 0.35, axes.noveltyWeight);
  const W_STACK = axes.stacks.length > 0 ? 0.15 : 0;
  const W_DOMAIN = axes.domains.length > 0 ? 0.1 : 0;
  const W_AUDIENCE = axes.audience.length > 0 ? 0.05 : 0;

  const relevance = e?.relevance ?? 0.5;
  const novelty = (e?.novelty ?? 5) / 10;

  let score = relevance * W_REL + novelty * W_NOV;

  // Stack overlap
  if (W_STACK > 0 && e?.stack && e.stack.length > 0) {
    const stackHit = countOverlap(e.stack, axes.stacks);
    score += clamp01(stackHit / Math.min(axes.stacks.length, 3)) * W_STACK;
  }

  // Domain overlap — check against item topics + audience + LLM tags
  if (W_DOMAIN > 0) {
    const itemDomains = [
      ...(item.topics ?? []),
      ...(e?.audience ?? []),
    ].map((s) => s.toLowerCase());
    const domainHit = axes.domains.filter((d) =>
      itemDomains.some((t) => t.includes(d.toLowerCase()))
    ).length;
    score += clamp01(domainHit / Math.min(axes.domains.length, 2)) * W_DOMAIN;
  }

  // Audience overlap
  if (W_AUDIENCE > 0 && e?.audience && e.audience.length > 0) {
    const audHit = countOverlap(e.audience, axes.audience);
    score += clamp01(audHit / axes.audience.length) * W_AUDIENCE;
  }

  // Onchain bonus, scaled by user's importance dial
  if (c?.hasBasePresence) {
    score += 0.2 * axes.onchainImportance;
  }
  if (c?.farcasterPowerBadge) {
    score += 0.05 * axes.onchainImportance;
  }

  // Maturity preference
  if (axes.maturityPreference !== "any" && e?.maturity) {
    if (e.maturity === axes.maturityPreference) {
      score += 0.08;
    } else if (
      // partial credit for adjacent levels
      (axes.maturityPreference === "production" && e.maturity === "early") ||
      (axes.maturityPreference === "early" &&
        (e.maturity === "toy" || e.maturity === "production"))
    ) {
      score += 0.02;
    } else {
      score -= 0.05;
    }
  }

  // Excluded topics — soft penalty
  if (axes.excludedTopics && axes.excludedTopics.length > 0) {
    const haystack = [
      item.title,
      item.description ?? "",
      ...(item.topics ?? []),
      ...(e?.stack ?? []),
    ]
      .join(" ")
      .toLowerCase();
    const hits = axes.excludedTopics.filter((t) =>
      haystack.includes(t.toLowerCase())
    ).length;
    score -= 0.15 * Math.min(hits, 3);
  }

  return score;
}

/**
 * Sort items in-place style (returns a sorted copy) by personalized score.
 * Returns the score alongside each item for debugging / UI display.
 */
export function rankItems(
  items: UnifiedItem[],
  axes: ProfileAxes
): Array<UnifiedItem & { _score: number }> {
  return items
    .map((it) => ({ ...it, _score: scoreItem(it, axes) }))
    .sort((a, b) => b._score - a._score);
}

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}

function lerp(lo: number, hi: number, t: number): number {
  return lo + (hi - lo) * clamp01(t);
}

function countOverlap(a: string[], b: string[]): number {
  const setB = new Set(b.map((s) => s.toLowerCase()));
  return a.filter((x) => setB.has(x.toLowerCase())).length;
}
