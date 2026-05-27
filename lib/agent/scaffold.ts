import { anthropic, MODELS } from "@/lib/anthropic";
import type { UnifiedItem } from "@/lib/sources/types";
import type { ProfileAxes } from "@/lib/profile/types";

export type ScaffoldFile = {
  path: string;
  content: string;
};

export type ScaffoldInspiration = {
  title: string;
  url: string;
  whatWeBorrowed: string;
};

export type Scaffold = {
  projectName: string;
  description: string;
  stack: string[];
  setup: string[];
  files: ScaffoldFile[];
  inspiredBy: ScaffoldInspiration[];
};

/**
 * Generate a runnable starter project inspired by the top discovered items.
 * The LLM is asked to return strict JSON; we parse defensively.
 */
export async function generateScaffold(
  query: string,
  topItems: UnifiedItem[],
  profile?: ProfileAxes
): Promise<Scaffold> {
  const inspiration = topItems.slice(0, 5).map((it) => ({
    title: it.title,
    url: it.url,
    purpose: it.extracted?.purpose ?? it.description ?? "(no description)",
    stack: it.extracted?.stack ?? [],
    novelty: it.extracted?.novelty,
    maturity: it.extracted?.maturity,
    source: it.source,
  }));

  const profileBlock = profile ? formatProfile(profile) : "";

  const prompt = [
    `You are scaffolding a new project for a developer.`,
    `Their request: "${query}"`,
    "",
    profileBlock,
    "",
    "Top items in this space (inspiration only — do NOT copy code, infer patterns):",
    JSON.stringify(inspiration, null, 2),
    "",
    "Generate a COMPLETE, RUNNABLE starter project. Follow the developer's stack preferences when reasonable. The generated code must compile and run as-is. No placeholder TODOs that break functionality.",
    "",
    "Return ONLY a JSON object (no markdown fences, no prose) with this exact shape:",
    `{
  "projectName": "kebab-case-name, max 30 chars",
  "description": "one-line tagline (max 100 chars)",
  "stack": ["TypeScript", "viem", ...],
  "setup": ["npm install", "cp .env.example .env", "npm run dev", ...],
  "files": [
    { "path": "package.json", "content": "<full JSON content>" },
    { "path": "README.md", "content": "<full markdown>" },
    { "path": "src/index.ts", "content": "<full TS source>" }
  ],
  "inspiredBy": [
    {
      "title": "matching item title from inspiration list",
      "url": "matching url",
      "whatWeBorrowed": "one-sentence: what pattern/idea was carried over"
    }
  ]
}`,
    "",
    "Constraints:",
    "- 5 to 8 files total. ALWAYS include: package.json, README.md, .gitignore, .env.example",
    "- Default to TypeScript unless the query strongly implies another stack",
    "- Real dependencies only (current versions), no made-up package names",
    "- README must include: 1-line description, prerequisites, install steps, usage example, env vars table",
    "- Include 2-4 \"inspiredBy\" entries citing items from the inspiration list",
    '- Each file content as a STRING. Multiline strings use \\n. Escape quotes properly.',
  ].join("\n");

  const response = await anthropic.messages.create({
    model: MODELS.reasoning,
    max_tokens: 16384,
    messages: [{ role: "user", content: prompt }],
  });

  const text = response.content
    .filter((b) => b.type === "text")
    .map((b) => (b as { type: "text"; text: string }).text)
    .join("");

  const parsed = parseScaffoldJson(text);
  if (!parsed) {
    throw new Error("LLM did not return valid scaffold JSON");
  }
  return validateAndCoerce(parsed);
}

function formatProfile(profile: ProfileAxes): string {
  const parts: string[] = ["Developer profile:"];
  if (profile.stacks.length > 0) {
    parts.push(`- Preferred stacks: ${profile.stacks.join(", ")}`);
  }
  if (profile.domains.length > 0) {
    parts.push(`- Domains: ${profile.domains.join(", ")}`);
  }
  if (profile.audience.length > 0) {
    parts.push(`- Building for: ${profile.audience.join(", ")}`);
  }
  if (profile.notes) {
    parts.push(`- About them: ${profile.notes}`);
  }
  return parts.length > 1 ? parts.join("\n") : "";
}

function parseScaffoldJson(text: string): unknown {
  const cleaned = text
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return null;
  try {
    return JSON.parse(cleaned.slice(start, end + 1));
  } catch (err) {
    console.error("Scaffold JSON parse failed:", err);
    return null;
  }
}

function validateAndCoerce(raw: unknown): Scaffold {
  if (!raw || typeof raw !== "object") {
    throw new Error("Scaffold: not an object");
  }
  const o = raw as Record<string, unknown>;
  const files = Array.isArray(o.files) ? o.files : [];
  return {
    projectName: typeof o.projectName === "string" ? o.projectName : "unnamed-project",
    description: typeof o.description === "string" ? o.description : "",
    stack: Array.isArray(o.stack) ? o.stack.map(String) : [],
    setup: Array.isArray(o.setup) ? o.setup.map(String) : [],
    files: files
      .filter(
        (f): f is { path: string; content: string } =>
          !!f &&
          typeof f === "object" &&
          typeof (f as Record<string, unknown>).path === "string" &&
          typeof (f as Record<string, unknown>).content === "string"
      )
      .map((f) => ({ path: f.path, content: f.content })),
    inspiredBy: Array.isArray(o.inspiredBy)
      ? (o.inspiredBy
          .filter((x): x is Record<string, unknown> => !!x && typeof x === "object")
          .map((x) => ({
            title: String(x.title ?? ""),
            url: String(x.url ?? ""),
            whatWeBorrowed: String(x.whatWeBorrowed ?? ""),
          })))
      : [],
  };
}
