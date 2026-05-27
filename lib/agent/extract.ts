import { anthropic, MODELS } from "@/lib/anthropic";
import type { ExtractedMetadata, UnifiedItem } from "@/lib/sources/types";
import type { ProfileAxes } from "@/lib/profile/types";
import { loadCachedExtractions, saveExtractions } from "./extraction-cache";

/**
 * Batched LLM extraction. Sends a compact representation of all items in a
 * single call and asks Claude to return a structured JSON array.
 *
 * Why batched: one ~3-5s call vs N calls; much cheaper, faster, and the
 * model can use cross-item context to calibrate novelty scores.
 *
 * If `profile` is provided, relevance scoring takes the user's stated
 * preferences into account, not just the literal query string.
 */
export async function extractMetadataForItems(
  query: string,
  items: UnifiedItem[],
  profile?: ProfileAxes
): Promise<UnifiedItem[]> {
  if (items.length === 0) return items;

  // Cache lookup: most items will already have stack/purpose/novelty/maturity
  // from a previous extraction. We still re-run the LLM for cache-miss items.
  // (Relevance varies by query — we accept the cached value as an approximation.)
  const cached = await loadCachedExtractions(items).catch((err) => {
    console.error("Cache lookup failed, proceeding without:", err);
    return new Map<string, ExtractedMetadata>();
  });

  const itemsWithCache = items.map((it) => {
    const hit = cached.get(`${it.source}:${it.externalId}`);
    return hit ? { ...it, extracted: hit } : it;
  });

  // Only send cache-miss items to the LLM
  const missingIdx = itemsWithCache
    .map((it, i) => (it.extracted ? -1 : i))
    .filter((i) => i >= 0);

  if (missingIdx.length === 0) {
    // 100% cache hit
    return itemsWithCache;
  }

  const compact = missingIdx.map((i, idx) => {
    const it = itemsWithCache[i];
    return {
      i: idx, // index within the compact array
      _orig: i,
      src: it.source,
      title: it.title,
      desc: it.description?.slice(0, 300) ?? null,
      topics: it.topics?.slice(0, 6) ?? [],
      lang: it.language ?? null,
      stars: it.signals.stars,
      points: it.signals.points,
    };
  });

  const profileBlock = profile ? buildProfileBlock(profile) : "";

  const prompt = [
    `You are a developer's research assistant. The user is searching for: "${query}".`,
    "",
    `Below are ${items.length} candidate items I collected across GitHub, Hacker News, and Reddit.`,
    "For each, extract structured metadata. Be honest — call out awesome-lists / generic roadmaps / commodity tutorials as low novelty. Reward genuinely new projects.",
    "",
    profileBlock,
    "",
    "Items (JSON):",
    JSON.stringify(compact, null, 2),
    "",
    "Return ONLY a JSON array (no markdown fences, no prose) with one object per item in the SAME order. Schema:",
    `[
  {
    "i": <int, the index>,
    "stack": ["TypeScript", "React", ...]  // max 5, detected technologies
    "purpose": "one short sentence summarizing what it actually does",
    "novelty": <1-10, 1=commodity, 10=genuine new idea>,
    "maturity": "toy" | "early" | "production",
    "audience": ["developers", "defi-users", ...]  // max 3
    "relevance": <0-1, how well it matches the user — combining literal query match AND profile fit>
  },
  ...
]`,
  ].join("\n");

  const response = await anthropic.messages.create({
    model: MODELS.extraction,
    max_tokens: 4096,
    messages: [{ role: "user", content: prompt }],
  });

  const text = response.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("");

  const parsed = parseJsonArray(text);
  if (!parsed) {
    console.error("LLM extraction returned unparseable output:", text.slice(0, 500));
    return itemsWithCache; // fail open: return cache hits, raw misses
  }

  // Map back to items by the compact-array index
  const byCompactIdx = new Map<number, ExtractedMetadata>();
  for (const row of parsed) {
    if (typeof row?.i === "number") {
      byCompactIdx.set(row.i, {
        stack: Array.isArray(row.stack) ? row.stack.slice(0, 5) : [],
        purpose: typeof row.purpose === "string" ? row.purpose : "",
        novelty: clamp(Number(row.novelty), 1, 10),
        maturity: ["toy", "early", "production"].includes(row.maturity)
          ? row.maturity
          : "early",
        audience: Array.isArray(row.audience) ? row.audience.slice(0, 3) : [],
        relevance: clamp(Number(row.relevance), 0, 1),
      });
    }
  }

  // Splice freshly-extracted metadata back onto the right items
  const result = [...itemsWithCache];
  for (let idx = 0; idx < missingIdx.length; idx++) {
    const origIndex = missingIdx[idx];
    const extracted = byCompactIdx.get(idx);
    if (extracted) {
      result[origIndex] = { ...result[origIndex], extracted };
    }
  }

  // Persist the newly-extracted items (fire-and-forget)
  const newlyExtracted = missingIdx
    .map((i) => result[i])
    .filter((it) => !!it.extracted);
  void saveExtractions(newlyExtracted);

  return result;
}

function parseJsonArray(text: string): any[] | null {
  // Strip code fences if any
  const cleaned = text
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();
  // Find first `[` and last `]` to be tolerant of pre/post prose
  const start = cleaned.indexOf("[");
  const end = cleaned.lastIndexOf("]");
  if (start === -1 || end === -1 || end <= start) return null;
  const slice = cleaned.slice(start, end + 1);
  try {
    const parsed = JSON.parse(slice);
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function clamp(n: number, lo: number, hi: number): number {
  if (!Number.isFinite(n)) return lo;
  return Math.max(lo, Math.min(hi, n));
}

function buildProfileBlock(profile: ProfileAxes): string {
  const parts: string[] = ["User profile (factor this into relevance):"];
  if (profile.stacks.length > 0) {
    parts.push(`- Prefers stacks: ${profile.stacks.join(", ")}`);
  }
  if (profile.domains.length > 0) {
    parts.push(`- Interested in domains: ${profile.domains.join(", ")}`);
  }
  if (profile.audience.length > 0) {
    parts.push(`- Identifies as / builds for: ${profile.audience.join(", ")}`);
  }
  if (profile.maturityPreference !== "any") {
    parts.push(`- Maturity preference: ${profile.maturityPreference}`);
  }
  parts.push(
    `- Novelty appetite: ${profile.noveltyWeight >= 0.7 ? "loves cutting-edge experiments" : profile.noveltyWeight <= 0.3 ? "prefers stable patterns" : "moderate"}`
  );
  if (profile.onchainImportance >= 0.7) {
    parts.push("- Strongly values onchain/crypto-native projects");
  }
  if (profile.excludedTopics && profile.excludedTopics.length > 0) {
    parts.push(`- Does NOT want: ${profile.excludedTopics.join(", ")}`);
  }
  if (profile.notes && profile.notes.trim().length > 0) {
    parts.push(`- Notes about self: ${profile.notes.trim()}`);
  }
  return parts.length > 1 ? parts.join("\n") : "";
}

// Anthropic SDK type re-export (avoids importing across whole codebase).
import type Anthropic from "@anthropic-ai/sdk";
