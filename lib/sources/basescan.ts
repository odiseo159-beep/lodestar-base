/**
 * Basescan API (Etherscan-compatible) — measure how active an address is on
 * Base mainnet. We're interested in two things:
 *   - did this address deploy verified contracts? (signal of "real builder")
 *   - is the address actually used? (tx count + first seen date)
 *
 * Free tier: 5 req/s, 100k req/day. We cache aggressively in creators_cache.
 *
 * Doc: https://docs.basescan.org
 */

export type BaseOnchainStats = {
  contractCount: number;
  txCount: number;
  firstTxAt: string | null;
  lastTxAt: string | null;
};

const BASESCAN_API = "https://api.basescan.org/api";

type EtherscanTxlistResponse = {
  status: "0" | "1";
  message: string;
  result: EtherscanTx[] | string;
};

type EtherscanTx = {
  timeStamp: string;
  hash: string;
  from: string;
  to: string;
  contractAddress: string;
  isError: string;
};

/**
 * Aggregate stats for a single address on Base mainnet. Returns zeroed stats
 * (and `null` timestamps) on missing key, no activity, or transient failure.
 *
 * NOTE: we cap to the first/last page of txs — for "is this person active?"
 * we don't need a full history, just enough signal.
 */
export async function getBaseStats(
  address: string
): Promise<BaseOnchainStats> {
  const apiKey = process.env.BASESCAN_API_KEY;
  const empty: BaseOnchainStats = {
    contractCount: 0,
    txCount: 0,
    firstTxAt: null,
    lastTxAt: null,
  };
  if (!apiKey || !address) return empty;

  const params = new URLSearchParams({
    module: "account",
    action: "txlist",
    address,
    startblock: "0",
    endblock: "99999999",
    page: "1",
    offset: "1000",
    sort: "asc",
    apikey: apiKey,
  });

  try {
    const res = await fetch(`${BASESCAN_API}?${params.toString()}`, {
      next: { revalidate: 3600 },
    });
    if (!res.ok) return empty;
    const data = (await res.json()) as EtherscanTxlistResponse;

    // Basescan returns status "0" with message "No transactions found" for
    // empty addresses — not a real error.
    if (data.status !== "1" || !Array.isArray(data.result)) return empty;

    const txs = data.result.filter((t) => t.isError === "0");
    const creations = txs.filter(
      (t) => t.contractAddress && t.contractAddress !== ""
    );

    const firstTs = txs[0]?.timeStamp;
    const lastTs = txs[txs.length - 1]?.timeStamp;

    return {
      contractCount: creations.length,
      txCount: txs.length,
      firstTxAt: firstTs ? new Date(Number(firstTs) * 1000).toISOString() : null,
      lastTxAt: lastTs ? new Date(Number(lastTs) * 1000).toISOString() : null,
    };
  } catch (err) {
    console.error(`Basescan txlist failed for ${address}:`, err);
    return empty;
  }
}

/**
 * Aggregate across multiple addresses (a Farcaster user can verify several).
 * Sums contract counts and tx counts, takes min(firstSeen), max(lastSeen).
 */
export async function getBaseStatsForAddresses(
  addresses: string[]
): Promise<BaseOnchainStats> {
  if (addresses.length === 0) {
    return { contractCount: 0, txCount: 0, firstTxAt: null, lastTxAt: null };
  }
  const all = await Promise.all(addresses.map((a) => getBaseStats(a)));
  return {
    contractCount: all.reduce((s, x) => s + x.contractCount, 0),
    txCount: all.reduce((s, x) => s + x.txCount, 0),
    firstTxAt: all
      .map((x) => x.firstTxAt)
      .filter((d): d is string => !!d)
      .sort()[0] ?? null,
    lastTxAt: all
      .map((x) => x.lastTxAt)
      .filter((d): d is string => !!d)
      .sort()
      .pop() ?? null,
  };
}
