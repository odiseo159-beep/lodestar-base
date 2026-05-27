import { rankItems } from "../lib/agent/score";
import type { UnifiedItem } from "../lib/sources/types";
import type { ProfileAxes } from "../lib/profile/types";
import { DEFAULT_AXES } from "../lib/profile/types";

const items: UnifiedItem[] = [
  {
    id: "1",
    source: "github",
    externalId: "1",
    title: "Foundry-based DeFi looper",
    url: "http://x",
    description: null,
    author: { handle: "a", avatarUrl: null, profileUrl: null },
    signals: { stars: 500 },
    createdAt: null,
    extracted: {
      stack: ["Solidity", "Foundry"],
      purpose: "leveraged looping",
      novelty: 7,
      maturity: "production",
      audience: ["defi-users"],
      relevance: 0.8,
    },
  },
  {
    id: "2",
    source: "github",
    externalId: "2",
    title: "TypeScript AI agent toy",
    url: "http://x",
    description: null,
    author: { handle: "b", avatarUrl: null, profileUrl: null },
    signals: { stars: 50 },
    createdAt: null,
    extracted: {
      stack: ["TypeScript", "React"],
      purpose: "tiny agent demo",
      novelty: 9,
      maturity: "toy",
      audience: ["developers"],
      relevance: 0.7,
    },
  },
  {
    id: "3",
    source: "github",
    externalId: "3",
    title: "Python ML production server",
    url: "http://x",
    description: null,
    author: { handle: "c", avatarUrl: null, profileUrl: null },
    signals: { stars: 2000 },
    createdAt: null,
    extracted: {
      stack: ["Python", "PyTorch"],
      purpose: "ML inference",
      novelty: 4,
      maturity: "production",
      audience: ["developers", "researchers"],
      relevance: 0.75,
    },
  },
  {
    id: "4",
    source: "github",
    externalId: "4",
    title: "Rust onchain MEV bot",
    url: "http://x",
    description: null,
    author: { handle: "d", avatarUrl: null, profileUrl: null },
    signals: { stars: 300 },
    createdAt: null,
    extracted: {
      stack: ["Rust"],
      purpose: "mev bot",
      novelty: 8,
      maturity: "early",
      audience: ["defi-users"],
      relevance: 0.85,
    },
    creator: {
      farcasterUsername: null,
      farcasterFid: null,
      farcasterPfpUrl: null,
      farcasterFollowers: 0,
      farcasterPowerBadge: false,
      baseContractCount: 5,
      baseTxCount: 120,
      baseFirstTxAt: null,
      hasBasePresence: true,
    },
  },
];

const profileA: ProfileAxes = {
  ...DEFAULT_AXES,
  stacks: ["Solidity", "Foundry"],
  domains: ["defi"],
  audience: ["defi-users"],
  noveltyWeight: 0.3,
  maturityPreference: "production",
  onchainImportance: 0.9,
};

const profileB: ProfileAxes = {
  ...DEFAULT_AXES,
  stacks: ["TypeScript"],
  domains: ["ai-agents"],
  audience: ["developers"],
  noveltyWeight: 0.9,
  maturityPreference: "toy",
  onchainImportance: 0.1,
};

console.log("=== Profile A (Solidity/DeFi, production, onchain matters) ===");
for (const it of rankItems(items, profileA))
  console.log(`  [${it._score.toFixed(3)}] ${it.title}`);

console.log("");
console.log("=== Profile B (TypeScript/AI, toy, novelty lover) ===");
for (const it of rankItems(items, profileB))
  console.log(`  [${it._score.toFixed(3)}] ${it.title}`);

console.log("");
console.log("=== Default (no profile) ===");
for (const it of rankItems(items, DEFAULT_AXES))
  console.log(`  [${it._score.toFixed(3)}] ${it.title}`);
