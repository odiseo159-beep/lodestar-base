import type { UnifiedItem } from "./types";

type AlgoliaHit = {
  objectID: string;
  title: string | null;
  url: string | null;
  author: string;
  points: number | null;
  num_comments: number | null;
  created_at: string;
  story_text: string | null;
};

type AlgoliaResponse = { hits: AlgoliaHit[] };

/**
 * Search "Show HN" posts via the public Algolia HN API (no auth needed).
 * Doc: https://hn.algolia.com/api
 */
export async function searchHackerNews(
  query: string,
  limit = 10
): Promise<UnifiedItem[]> {
  const params = new URLSearchParams({
    query,
    tags: "show_hn",
    hitsPerPage: String(limit),
  });
  const res = await fetch(
    `https://hn.algolia.com/api/v1/search?${params.toString()}`,
    { next: { revalidate: 600 } }
  );
  if (!res.ok) {
    throw new Error(`HN Algolia API responded ${res.status}`);
  }
  const data = (await res.json()) as AlgoliaResponse;

  return data.hits.map((hit): UnifiedItem => {
    const hnUrl = `https://news.ycombinator.com/item?id=${hit.objectID}`;
    return {
      id: `hn:${hit.objectID}`,
      source: "hn",
      externalId: hit.objectID,
      title: hit.title ?? "(untitled)",
      url: hit.url ?? hnUrl,
      description: hit.story_text
        ? stripHtml(hit.story_text).slice(0, 500)
        : null,
      author: {
        handle: hit.author,
        avatarUrl: null,
        profileUrl: `https://news.ycombinator.com/user?id=${hit.author}`,
      },
      signals: {
        points: hit.points ?? 0,
        comments: hit.num_comments ?? 0,
      },
      createdAt: hit.created_at,
    };
  });
}

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
