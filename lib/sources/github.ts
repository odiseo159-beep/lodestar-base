import { Octokit } from "@octokit/rest";
import type { UnifiedItem } from "./types";

const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN,
});

export type GitHubRepo = {
  id: number;
  name: string;
  fullName: string;
  url: string;
  description: string | null;
  stars: number;
  forks: number;
  language: string | null;
  topics: string[];
  updatedAt: string;
  createdAt: string;
  owner: {
    login: string;
    type: string;
    url: string;
    avatarUrl: string;
  };
};

export type SearchSort = "stars" | "updated" | "best-match";

export async function searchGithub(
  query: string,
  options: { limit?: number; sort?: SearchSort; recentDays?: number } = {}
): Promise<GitHubRepo[]> {
  const { limit = 20, sort = "stars", recentDays } = options;

  let q = `${query} in:name,description,readme`;
  if (recentDays && recentDays > 0) {
    const since = new Date(Date.now() - recentDays * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);
    q += ` pushed:>${since}`;
  }

  const res = await octokit.search.repos({
    q,
    sort: sort === "best-match" ? undefined : sort,
    order: "desc",
    per_page: Math.min(limit, 100),
  });

  return res.data.items.map((item) => ({
    id: item.id,
    name: item.name,
    fullName: item.full_name,
    url: item.html_url,
    description: item.description,
    stars: item.stargazers_count,
    forks: item.forks_count,
    language: item.language,
    topics: item.topics ?? [],
    updatedAt: item.updated_at ?? item.pushed_at ?? "",
    createdAt: item.created_at ?? "",
    owner: {
      login: item.owner?.login ?? "",
      type: item.owner?.type ?? "User",
      url: item.owner?.html_url ?? "",
      avatarUrl: item.owner?.avatar_url ?? "",
    },
  }));
}

/**
 * Same query as `searchGithub` but returns items in the unified shape used
 * across the aggregator and the agent.
 */
export async function searchGithubUnified(
  query: string,
  options: { limit?: number; sort?: SearchSort; recentDays?: number } = {}
): Promise<UnifiedItem[]> {
  const repos = await searchGithub(query, options);
  return repos.map((repo): UnifiedItem => ({
    id: `github:${repo.id}`,
    source: "github",
    externalId: String(repo.id),
    title: repo.fullName,
    url: repo.url,
    description: repo.description,
    author: {
      handle: repo.owner.login,
      avatarUrl: repo.owner.avatarUrl,
      profileUrl: repo.owner.url,
    },
    signals: {
      stars: repo.stars,
      forks: repo.forks,
    },
    language: repo.language,
    topics: repo.topics,
    createdAt: repo.updatedAt || null,
  }));
}
