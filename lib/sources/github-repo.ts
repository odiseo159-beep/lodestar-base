import { Octokit } from "@octokit/rest";

const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN,
});

export type RepoContent = {
  owner: string;
  repo: string;
  url: string;
  description: string | null;
  language: string | null;
  topics: string[];
  stars: number;
  forks: number;
  defaultBranch: string;
  pushedAt: string | null;
  ownerAvatarUrl: string;
  /** First N chars of README, normalized as plain text */
  readme: string | null;
  /** package.json / Cargo.toml / pyproject.toml / go.mod — whichever found first */
  manifest: { path: string; content: string } | null;
};

const README_LIMIT = 8000;
const MANIFEST_LIMIT = 4000;

const MANIFEST_CANDIDATES = [
  "package.json",
  "pyproject.toml",
  "Cargo.toml",
  "go.mod",
  "composer.json",
  "Gemfile",
  "requirements.txt",
];

/**
 * Parse a GitHub repo identifier from various input formats:
 *   - https://github.com/owner/repo
 *   - https://github.com/owner/repo.git
 *   - https://github.com/owner/repo/tree/branch
 *   - github.com/owner/repo
 *   - owner/repo
 */
export function parseRepoUrl(
  input: string
): { owner: string; repo: string } | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  // Normalize protocol + host
  const normalized = trimmed
    .replace(/^https?:\/\//, "")
    .replace(/^github\.com\//, "")
    .replace(/\.git$/, "")
    .replace(/^\/+|\/+$/g, "");

  const parts = normalized.split("/").filter(Boolean);
  if (parts.length < 2) return null;

  const owner = parts[0];
  const repo = parts[1];
  // Reject obviously bad inputs
  if (!/^[A-Za-z0-9_.\-]+$/.test(owner) || !/^[A-Za-z0-9_.\-]+$/.test(repo)) {
    return null;
  }
  return { owner, repo };
}

export async function fetchRepoContent(
  owner: string,
  repo: string
): Promise<RepoContent> {
  const [meta, readme, rootContents] = await Promise.all([
    octokit.repos.get({ owner, repo }),
    octokit.repos.getReadme({ owner, repo }).catch(() => null),
    octokit.repos
      .getContent({ owner, repo, path: "" })
      .catch(() => ({ data: [] as unknown })),
  ]);

  // Decode README
  let readmeText: string | null = null;
  if (readme && "data" in readme && readme.data && "content" in readme.data) {
    const decoded = Buffer.from(readme.data.content, "base64").toString("utf-8");
    readmeText = stripMarkdownNoise(decoded).slice(0, README_LIMIT);
  }

  // Find manifest in root
  let manifest: RepoContent["manifest"] = null;
  const rootList = Array.isArray(rootContents.data) ? rootContents.data : [];
  for (const candidate of MANIFEST_CANDIDATES) {
    const hit = rootList.find(
      (f) => "name" in f && f.name === candidate && f.type === "file"
    );
    if (hit) {
      const content = await octokit.repos
        .getContent({ owner, repo, path: candidate })
        .catch(() => null);
      if (
        content &&
        "data" in content &&
        content.data &&
        !Array.isArray(content.data) &&
        "content" in content.data
      ) {
        const decoded = Buffer.from(content.data.content, "base64").toString(
          "utf-8"
        );
        manifest = {
          path: candidate,
          content: decoded.slice(0, MANIFEST_LIMIT),
        };
        break;
      }
    }
  }

  const m = meta.data;
  return {
    owner,
    repo,
    url: m.html_url,
    description: m.description,
    language: m.language,
    topics: m.topics ?? [],
    stars: m.stargazers_count,
    forks: m.forks_count,
    defaultBranch: m.default_branch,
    pushedAt: m.pushed_at,
    ownerAvatarUrl: m.owner.avatar_url,
    readme: readmeText,
    manifest,
  };
}

function stripMarkdownNoise(md: string): string {
  return md
    .replace(/<!--[\s\S]*?-->/g, "") // HTML comments
    .replace(/<img[^>]*>/gi, "") // raw img tags
    .replace(/!\[[^\]]*\]\([^)]+\)/g, "") // markdown images
    .replace(/^[\s\S]*?<\/p>/i, (m) => m) // leave first paragraph if HTML-wrapped
    .replace(/\r\n/g, "\n")
    .trim();
}

const STOPWORDS = new Set([
  "the",
  "a",
  "an",
  "of",
  "for",
  "to",
  "in",
  "on",
  "and",
  "or",
  "with",
  "is",
  "are",
  "be",
  "by",
  "from",
  "as",
  "at",
  "your",
  "build",
  "make",
  "fastest",
  "easiest",
  "simple",
  "easy",
  "quick",
]);

/**
 * Build a search query that should surface peer projects for this repo.
 *
 * Strategy: topics are discriminating tags so they go first. Description
 * words are sprinkled in (minus stopwords + marketing fluff). Language
 * goes last. We de-dup to avoid e.g. "farcaster farcaster-frames" both
 * matching the same concept.
 */
export function inferPeerQuery(content: RepoContent): string {
  const parts: string[] = [];

  // Discriminating tags first
  parts.push(...content.topics.slice(0, 4));

  // Description words, minus filler
  if (content.description) {
    const descWords = content.description
      .toLowerCase()
      .replace(/[^\w\s\-+]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 2 && !STOPWORDS.has(w))
      .slice(0, 5);
    parts.push(...descWords);
  }

  if (content.language) parts.push(content.language);

  // De-dup preserving order
  const seen = new Set<string>();
  const deduped = parts.filter((p) => {
    const k = p.toLowerCase();
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });

  return deduped
    .join(" ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 100);
}
