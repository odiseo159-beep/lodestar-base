import type { NextRequest } from "next/server";
import { z } from "zod";
import { searchAllSources } from "@/lib/sources";
import { extractMetadataForItems } from "@/lib/agent/extract";
import { enrichGithubCreators } from "@/lib/agent/enrich-creator";
import { rankItems } from "@/lib/agent/score";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { searches } from "@/lib/db/schema";
import type { CreatorOnchain } from "@/lib/sources/types";
import { getProfileAxes } from "@/lib/profile/repository";
import { DEFAULT_AXES } from "@/lib/profile/types";

const querySchema = z.object({
  q: z.string().min(2).max(120),
  perSource: z.coerce.number().min(1).max(30).default(10),
  enrich: z
    .union([z.literal("true"), z.literal("false")])
    .optional()
    .transform((v) => v !== "false"), // default true
  sources: z
    .string()
    .optional()
    .transform((v) =>
      v ? (v.split(",").filter(Boolean) as ("github" | "hn" | "reddit")[]) : undefined
    ),
});

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const parsed = querySchema.safeParse({
    q: searchParams.get("q"),
    perSource: searchParams.get("perSource") ?? undefined,
    enrich: searchParams.get("enrich") ?? undefined,
    sources: searchParams.get("sources") ?? undefined,
  });

  if (!parsed.success) {
    return Response.json(
      { error: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const startedAt = performance.now();

  try {
    // 0. Fetch user profile (or defaults if no session)
    const session = await auth();
    const profile = session?.user?.id
      ? await getProfileAxes(session.user.id)
      : DEFAULT_AXES;

    // 1. Aggregate from all sources in parallel + dedupe
    const raw = await searchAllSources(parsed.data.q, {
      sources: parsed.data.sources,
      perSourceLimit: parsed.data.perSource,
    });

    // 2. Creator enrichment + LLM extraction run in parallel — they're
    //    independent and both are I/O-bound, so we don't pay for them
    //    serially. The LLM gets the user's profile so its `relevance`
    //    score is personalized.
    const [creators, withMetadata] = await Promise.all([
      enrichGithubCreators(raw).catch((err) => {
        console.error("Creator enrichment failed:", err);
        return new Map();
      }),
      parsed.data.enrich
        ? extractMetadataForItems(parsed.data.q, raw, profile).catch((err) => {
            console.error("Extraction failed, returning raw items:", err);
            return raw;
          })
        : Promise.resolve(raw),
    ]);

    // Attach creator enrichment to items
    const enriched = withMetadata.map((item) => {
      if (item.source !== "github") return item;
      const c = creators.get(item.author.handle.toLowerCase());
      if (!c) return item;
      const creator: CreatorOnchain = {
        farcasterUsername: c.farcaster?.username ?? null,
        farcasterFid: c.farcaster?.fid ?? null,
        farcasterPfpUrl: c.farcaster?.pfpUrl ?? null,
        farcasterFollowers: c.farcaster?.followerCount ?? 0,
        farcasterPowerBadge: c.farcaster?.powerBadge ?? false,
        baseContractCount: c.base.contractCount,
        baseTxCount: c.base.txCount,
        baseFirstTxAt: c.base.firstTxAt,
        hasBasePresence: c.base.contractCount > 0 || c.base.txCount > 5,
      };
      return { ...item, creator };
    });

    // 3. Personalized scoring — applies stack/domain/audience/onchain/maturity
    //    weights from the user's profile. Identical query yields different
    //    rankings across users with different profiles.
    const sorted = rankItems(enriched, profile);

    // 4. Persist search history if signed in (fire-and-forget)
    const usedSources = [
      ...new Set(sorted.map((it) => it.source)),
    ];
    if (session?.user?.id) {
      db.insert(searches)
        .values({
          userId: session.user.id,
          query: parsed.data.q,
          sources: usedSources,
          resultsCount: sorted.length,
        })
        .catch((err) => {
          console.error("Failed to persist search:", err);
        });
    }

    return Response.json({
      query: parsed.data.q,
      sources: usedSources,
      enriched: parsed.data.enrich,
      count: sorted.length,
      items: sorted,
      responseMs: Math.round(performance.now() - startedAt),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown error";
    return Response.json({ error: message }, { status: 500 });
  }
}
