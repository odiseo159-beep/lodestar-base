import type { UnifiedItem } from "./types";

type RedditChild = {
  data: {
    id: string;
    title: string;
    url_overridden_by_dest?: string;
    url: string;
    permalink: string;
    author: string;
    score: number;
    num_comments: number;
    created_utc: number;
    selftext: string;
    subreddit: string;
  };
};

type RedditResponse = {
  data?: { children: RedditChild[] };
};

/**
 * Search Reddit JSON endpoint (no auth needed, requires User-Agent).
 * Prioritizes subreddits where indie hackers and builders post side projects.
 */
const PREFERRED_SUBS = [
  "SideProject",
  "selfhosted",
  "opensource",
  "webdev",
  "MachineLearning",
  "LocalLLaMA",
  "ethdev",
  "ethfinance",
];

export async function searchReddit(
  query: string,
  limit = 10
): Promise<UnifiedItem[]> {
  // Bias toward our preferred subs but allow others through.
  const subBias = PREFERRED_SUBS.map((s) => `subreddit:${s}`).join(" OR ");
  const params = new URLSearchParams({
    q: `${query} (${subBias})`,
    limit: String(limit),
    sort: "top",
    t: "year",
    restrict_sr: "false",
    raw_json: "1",
  });

  const res = await fetch(
    `https://www.reddit.com/search.json?${params.toString()}`,
    {
      headers: { "User-Agent": "lodestar-research/0.1" },
      next: { revalidate: 600 },
    }
  );
  if (!res.ok) {
    throw new Error(`Reddit API responded ${res.status}`);
  }
  const data = (await res.json()) as RedditResponse;
  const children = data.data?.children ?? [];

  return children.map((c): UnifiedItem => {
    const p = c.data;
    const dest = p.url_overridden_by_dest ?? p.url;
    return {
      id: `reddit:${p.id}`,
      source: "reddit",
      externalId: p.id,
      title: p.title,
      url: dest,
      description: p.selftext ? p.selftext.slice(0, 500) : null,
      author: {
        handle: p.author,
        avatarUrl: null,
        profileUrl: `https://reddit.com/u/${p.author}`,
      },
      signals: {
        points: p.score ?? 0,
        comments: p.num_comments ?? 0,
      },
      topics: [`r/${p.subreddit}`],
      createdAt: new Date(p.created_utc * 1000).toISOString(),
    };
  });
}
