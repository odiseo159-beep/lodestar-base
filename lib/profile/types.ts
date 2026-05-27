/**
 * Persistent user profile — the agent's memory of what each user cares about.
 * Stored as JSON in `profiles.axes`.
 */
export type ProfileAxes = {
  /** Preferred languages / frameworks. Boost items matching. */
  stacks: string[];
  /** Domains of interest: "defi", "infra", "ai-agents", "frontend", "ml", "dev-tools", "creator-tools" */
  domains: string[];
  /** Who the user identifies as / which audience they like building for. */
  audience: string[];
  /** 0-1. 0 = pure stable/commodity, 1 = cutting-edge experimental. Default 0.5. */
  noveltyWeight: number;
  /** Maturity filter. "any" passes through. */
  maturityPreference: "any" | "toy" | "early" | "production";
  /** 0-1. 0 = ignore onchain, 1 = strongly prefer creators with Base activity. */
  onchainImportance: number;
  /** Optional negative filter — items mentioning these topics get penalized. */
  excludedTopics?: string[];
  /** Free-text "about me" the agent can read when personalizing relevance. */
  notes?: string;
};

export const DEFAULT_AXES: ProfileAxes = {
  stacks: [],
  domains: [],
  audience: [],
  noveltyWeight: 0.5,
  maturityPreference: "any",
  onchainImportance: 0.5,
  excludedTopics: [],
  notes: "",
};

export const STACK_SUGGESTIONS = [
  "TypeScript",
  "Python",
  "Rust",
  "Solidity",
  "Go",
  "Swift",
  "Java",
  "C++",
  "React",
  "Next.js",
  "Svelte",
  "Vue",
  "Foundry",
  "Hardhat",
  "Viem",
  "Wagmi",
  "PyTorch",
  "TensorFlow",
];

export const DOMAIN_SUGGESTIONS = [
  "ai-agents",
  "defi",
  "infra",
  "dev-tools",
  "ml",
  "frontend",
  "backend",
  "blockchain",
  "creator-tools",
  "security",
  "data",
  "design",
];

export const AUDIENCE_SUGGESTIONS = [
  "developers",
  "founders",
  "designers",
  "researchers",
  "indie-hackers",
  "enterprises",
  "creators",
  "defi-users",
  "crypto-natives",
];
