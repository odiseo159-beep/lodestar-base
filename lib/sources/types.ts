/**
 * Unified shape across all sources (GitHub, HN, Reddit, …).
 * Sources adapt their native payload into this shape before aggregation.
 */
export type SourceKind = "github" | "hn" | "reddit";

export type ExtractedMetadata = {
  stack: string[];
  purpose: string;
  novelty: number;
  maturity: "toy" | "early" | "production";
  audience: string[];
  relevance: number;
};

export type CreatorOnchain = {
  farcasterUsername: string | null;
  farcasterFid: number | null;
  farcasterPfpUrl: string | null;
  farcasterFollowers: number;
  farcasterPowerBadge: boolean;
  baseContractCount: number;
  baseTxCount: number;
  baseFirstTxAt: string | null;
  /** Convenience flag: at least 1 verified contract on Base. */
  hasBasePresence: boolean;
};

export type UnifiedItem = {
  /** Stable id: `${source}:${externalId}` */
  id: string;
  source: SourceKind;
  externalId: string;
  title: string;
  url: string;
  description: string | null;
  author: {
    handle: string;
    avatarUrl: string | null;
    profileUrl: string | null;
  };
  signals: {
    stars?: number;
    forks?: number;
    points?: number;
    comments?: number;
  };
  language?: string | null;
  topics?: string[];
  createdAt: string | null;
  /** Populated by the LLM extraction step. */
  extracted?: ExtractedMetadata;
  /** Populated by the creator enrichment step (GitHub items only). */
  creator?: CreatorOnchain;
};
