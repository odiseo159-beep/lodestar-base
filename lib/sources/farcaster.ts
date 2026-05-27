/**
 * Neynar v2 wrapper — look up a Farcaster user by username and return
 * their verified addresses (so we can ask Base whether they actually ship).
 *
 * Doc: https://docs.neynar.com
 */

export type FarcasterProfile = {
  fid: number;
  username: string;
  displayName: string;
  pfpUrl: string | null;
  bio: string;
  followerCount: number;
  followingCount: number;
  verifiedEthAddresses: string[];
  verifiedSolAddresses: string[];
  powerBadge: boolean;
};

type NeynarUser = {
  fid: number;
  username: string;
  display_name: string;
  pfp_url?: string;
  profile?: { bio?: { text?: string } };
  follower_count: number;
  following_count: number;
  verified_addresses?: {
    eth_addresses?: string[];
    sol_addresses?: string[];
  };
  power_badge?: boolean;
};

const NEYNAR_BASE = "https://api.neynar.com/v2/farcaster";

/**
 * Find a Farcaster profile by exact username match (case-insensitive).
 * Returns null when no match, when the key is missing, or on transient
 * upstream failure (logged, not thrown).
 */
export async function findFarcasterByUsername(
  username: string
): Promise<FarcasterProfile | null> {
  const apiKey = process.env.NEYNAR_API_KEY;
  if (!apiKey) return null;
  if (!username || username.length < 1) return null;

  const url = `${NEYNAR_BASE}/user/by_username?username=${encodeURIComponent(username)}`;
  try {
    const res = await fetch(url, {
      headers: {
        "x-api-key": apiKey,
        accept: "application/json",
      },
      // Light caching — we re-encounter handles often.
      next: { revalidate: 3600 },
    });
    if (res.status === 404) return null;
    if (res.status === 429) {
      // Rate-limited — surface as an exception so the caller can skip
      // caching this as "no match".
      throw new Error(`Neynar rate limit (429) for ${username}`);
    }
    if (!res.ok) {
      throw new Error(`Neynar ${res.status} for ${username}`);
    }
    const data = (await res.json()) as { user?: NeynarUser };
    if (!data.user) return null;
    return normalize(data.user);
  } catch (err) {
    console.error(`Neynar fetch failed for ${username}:`, err);
    return null;
  }
}

function normalize(u: NeynarUser): FarcasterProfile {
  return {
    fid: u.fid,
    username: u.username,
    displayName: u.display_name,
    pfpUrl: u.pfp_url ?? null,
    bio: u.profile?.bio?.text ?? "",
    followerCount: u.follower_count,
    followingCount: u.following_count,
    verifiedEthAddresses: u.verified_addresses?.eth_addresses ?? [],
    verifiedSolAddresses: u.verified_addresses?.sol_addresses ?? [],
    powerBadge: !!u.power_badge,
  };
}
