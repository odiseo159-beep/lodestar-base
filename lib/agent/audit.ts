import { anthropic, MODELS } from "@/lib/anthropic";
import type { RepoContent } from "@/lib/sources/github-repo";
import type { UnifiedItem } from "@/lib/sources/types";
import type { ProfileAxes } from "@/lib/profile/types";

export type AuditImprovementCategory =
  | "quick-win"
  | "pattern-gap"
  | "stack"
  | "docs"
  | "infra"
  | "novelty"
  | "security";

export type AuditImprovement = {
  category: AuditImprovementCategory;
  title: string;
  detail: string;
  priority: "high" | "medium" | "low";
  effort: "small" | "medium" | "large";
  inspiredBy?: string;
};

export type AuditPeer = {
  title: string;
  url: string;
  whyRelevant: string;
};

export type AuditResult = {
  repo: {
    owner: string;
    repo: string;
    url: string;
    stars: number;
    description: string | null;
  };
  inferredQuery: string;
  summary: string;
  strengths: string[];
  peers: AuditPeer[];
  improvements: AuditImprovement[];
};

/**
 * Generate a structured audit of a target repo by comparing it to peer
 * projects found through the existing discovery pipeline.
 *
 * The LLM is given:
 *   - A condensed view of the target repo (metadata + README + manifest)
 *   - The top peer items (with extracted metadata: purpose, stack, novelty)
 *   - The user's profile (if signed in) so suggestions are personalized
 *
 * It returns 5-10 concrete improvements with category + priority + effort.
 */
export async function generateAudit(
  target: RepoContent,
  peers: UnifiedItem[],
  inferredQuery: string,
  profile?: ProfileAxes
): Promise<AuditResult> {
  const peerSummary = peers.slice(0, 6).map((it) => ({
    title: it.title,
    url: it.url,
    source: it.source,
    purpose: it.extracted?.purpose ?? it.description ?? "(no description)",
    stack: it.extracted?.stack ?? [],
    maturity: it.extracted?.maturity,
    novelty: it.extracted?.novelty,
    stars: it.signals.stars,
  }));

  const profileBlock = profile ? formatProfile(profile) : "";

  const prompt = [
    `You are a senior engineer reviewing an open-source repository to suggest concrete improvements.`,
    "",
    `Target repo: ${target.owner}/${target.repo}`,
    `Description: ${target.description ?? "(none)"}`,
    `Language: ${target.language ?? "unknown"}`,
    `Topics: ${target.topics.join(", ") || "(none)"}`,
    `Stars: ${target.stars}  Forks: ${target.forks}`,
    "",
    "README (truncated):",
    target.readme ?? "(no README)",
    "",
    "Manifest:",
    target.manifest
      ? `--- ${target.manifest.path} ---\n${target.manifest.content}`
      : "(none found)",
    "",
    `Peers found via discovery for query "${inferredQuery}":`,
    JSON.stringify(peerSummary, null, 2),
    "",
    profileBlock,
    "",
    "Compare the target repo against the peers. Identify CONCRETE gaps and improvements — things the peers do well that this repo is missing, or signals the repo is behind on convention/quality. Be honest. If the repo is already strong, fewer findings is fine — don't pad.",
    "",
    "Return ONLY a JSON object (no markdown fences, no prose) with this shape:",
    `{
  "summary": "1-2 sentence overall positioning vs peers",
  "strengths": ["string", ...],  // 0-4 things this repo does well
  "peers": [
    { "title": "peer title", "url": "peer url", "whyRelevant": "one sentence" }
  ],
  "improvements": [
    {
      "category": "quick-win" | "pattern-gap" | "stack" | "docs" | "infra" | "novelty" | "security",
      "title": "short, imperative ('Add X', 'Adopt Y')",
      "detail": "1-2 sentences explaining what and why",
      "priority": "high" | "medium" | "low",
      "effort": "small" | "medium" | "large",
      "inspiredBy": "optional peer title that exemplifies this pattern"
    }
  ]
}`,
    "",
    "Constraints:",
    "- 5 to 10 improvements (fewer if the repo is genuinely solid)",
    "- 3-6 peers cited",
    "- Improvements must be ACTIONABLE — no vague 'consider improving'.",
    "- 'quick-win' items should be small effort + high impact",
    "- Don't suggest stack rewrites unless clearly warranted",
    "- Focus on what peers ACTUALLY do (don't invent best practices)",
  ].join("\n");

  const response = await anthropic.messages.create({
    model: MODELS.reasoning,
    max_tokens: 8192,
    messages: [{ role: "user", content: prompt }],
  });

  const text = response.content
    .filter((b) => b.type === "text")
    .map((b) => (b as { type: "text"; text: string }).text)
    .join("");

  const parsed = parseAuditJson(text);
  if (!parsed) {
    throw new Error("LLM did not return valid audit JSON");
  }

  return {
    repo: {
      owner: target.owner,
      repo: target.repo,
      url: target.url,
      stars: target.stars,
      description: target.description,
    },
    inferredQuery,
    summary: typeof parsed.summary === "string" ? parsed.summary : "",
    strengths: Array.isArray(parsed.strengths)
      ? parsed.strengths.map(String).slice(0, 4)
      : [],
    peers: Array.isArray(parsed.peers)
      ? parsed.peers
          .filter(
            (p): p is Record<string, unknown> => !!p && typeof p === "object"
          )
          .map((p) => ({
            title: String(p.title ?? ""),
            url: String(p.url ?? ""),
            whyRelevant: String(p.whyRelevant ?? ""),
          }))
          .slice(0, 8)
      : [],
    improvements: Array.isArray(parsed.improvements)
      ? parsed.improvements
          .filter(
            (i): i is Record<string, unknown> => !!i && typeof i === "object"
          )
          .map((i) => ({
            category: validCategory(String(i.category)),
            title: String(i.title ?? ""),
            detail: String(i.detail ?? ""),
            priority: validPriority(String(i.priority)),
            effort: validEffort(String(i.effort)),
            inspiredBy: i.inspiredBy ? String(i.inspiredBy) : undefined,
          }))
          .slice(0, 10)
      : [],
  };
}

function parseAuditJson(text: string): Record<string, unknown> | null {
  const cleaned = text
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return null;
  try {
    const parsed = JSON.parse(cleaned.slice(start, end + 1));
    return typeof parsed === "object" && parsed !== null
      ? (parsed as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

function validCategory(s: string): AuditImprovementCategory {
  const allowed: AuditImprovementCategory[] = [
    "quick-win",
    "pattern-gap",
    "stack",
    "docs",
    "infra",
    "novelty",
    "security",
  ];
  return (allowed as string[]).includes(s)
    ? (s as AuditImprovementCategory)
    : "pattern-gap";
}

function validPriority(s: string): "high" | "medium" | "low" {
  return s === "high" || s === "medium" || s === "low" ? s : "medium";
}

function validEffort(s: string): "small" | "medium" | "large" {
  return s === "small" || s === "medium" || s === "large" ? s : "medium";
}

function formatProfile(profile: ProfileAxes): string {
  const parts: string[] = ["Reviewer profile (factor into recommendations):"];
  if (profile.stacks.length > 0) {
    parts.push(`- Familiar with: ${profile.stacks.join(", ")}`);
  }
  if (profile.domains.length > 0) {
    parts.push(`- Cares about: ${profile.domains.join(", ")}`);
  }
  if (profile.maturityPreference !== "any") {
    parts.push(`- Maturity target: ${profile.maturityPreference}`);
  }
  if (profile.notes) {
    parts.push(`- Context: ${profile.notes}`);
  }
  return parts.length > 1 ? parts.join("\n") : "";
}
