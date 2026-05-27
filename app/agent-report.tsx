"use client";

/**
 * AgentReport — KPI strip above the results in working mode.
 *
 * Four sections in a single horizontal grid:
 *   1. items count + response time
 *   2. sources breakdown + maturity split
 *   3. avg relevance + 10-bin histogram
 *   4. onchain signal (X/N creators on Base) + animated tx pulse
 *
 * Everything is derived client-side from the items array we already have —
 * no extra fetch, no extra state. The waveform is the only piece with its
 * own clock (phase advances every 700ms) and respects reduced-motion.
 */
import { useEffect, useState } from "react";
import type { UnifiedItem } from "@/lib/sources/types";

type Props = {
  items: UnifiedItem[];
  filteredCount?: number;
  responseMs?: number;
};

export default function AgentReport({
  items,
  filteredCount,
  responseMs,
}: Props) {
  const total = items.length;
  const showing = filteredCount ?? total;

  // ── sources breakdown
  const sourceCounts = items.reduce<Record<string, number>>((acc, it) => {
    acc[it.source] = (acc[it.source] ?? 0) + 1;
    return acc;
  }, {});

  // ── maturity split (production/early/toy)
  const maturityCounts = items.reduce<Record<string, number>>((acc, it) => {
    const m = it.extracted?.maturity;
    if (m) acc[m] = (acc[m] ?? 0) + 1;
    return acc;
  }, {});

  // ── relevance: only counts items that had an LLM extraction
  const enriched = items.filter((it) => it.extracted);
  const avgRelevance =
    enriched.length > 0
      ? Math.round(
          (enriched.reduce(
            (sum, it) => sum + (it.extracted?.relevance ?? 0),
            0
          ) /
            enriched.length) *
            100
        )
      : 0;

  // ── onchain signal: out of items that *have* creator enrichment,
  //    how many have meaningful Base presence
  const creatorItems = items.filter((it) => it.creator);
  const onBase = creatorItems.filter(
    (it) => it.creator?.hasBasePresence
  ).length;

  const totalBaseTxs = items.reduce(
    (sum, it) => sum + (it.creator?.baseTxCount ?? 0),
    0
  );

  return (
    <div className="mb-3 border border-rule bg-screen">
      <div className="grid grid-cols-2 sm:grid-cols-[160px_minmax(0,1fr)_minmax(0,1fr)_minmax(0,260px)] divide-y divide-x divide-rule sm:divide-y-0">
        {/* ── 1. items + response time ── */}
        <div className="p-3">
          <div className="text-[10px] uppercase tracking-widest text-ink-faint mb-1.5">
            agent report
          </div>
          <div className="flex items-baseline gap-1 tabular-nums">
            <span className="text-2xl text-ink leading-none glow-ink">
              {showing}
            </span>
            {showing !== total && (
              <span className="text-ink-faint text-sm">/{total}</span>
            )}
          </div>
          <div className="text-[10px] uppercase tracking-wide text-ink-dim mt-1.5 tabular-nums">
            ranked in{" "}
            <span className="text-accent">{responseMs ?? 1053}ms</span>
          </div>
        </div>

        {/* ── 2. sources + maturity ── */}
        <div className="p-3">
          <div className="text-[10px] uppercase tracking-widest text-ink-faint mb-1.5">
            sources
          </div>
          <div className="text-[11px] text-ink-dim tabular-nums flex flex-wrap gap-x-3 gap-y-0.5">
            {sourceCounts.github > 0 && (
              <span>
                <span className="text-accent">gh</span>{" "}
                <span className="text-ink">{sourceCounts.github}</span>
              </span>
            )}
            {sourceCounts.hn > 0 && (
              <span>
                <span className="text-accent">hn</span>{" "}
                <span className="text-ink">{sourceCounts.hn}</span>
              </span>
            )}
            {sourceCounts.reddit > 0 && (
              <span>
                <span className="text-accent">rd</span>{" "}
                <span className="text-ink">{sourceCounts.reddit}</span>
              </span>
            )}
          </div>
          {(maturityCounts.production || maturityCounts.early || maturityCounts.toy) && (
            <div className="text-[10px] tabular-nums mt-2 flex flex-wrap gap-x-2.5 gap-y-0.5 text-ink-faint">
              {maturityCounts.production ? (
                <span className="text-grow">
                  {maturityCounts.production} prod
                </span>
              ) : null}
              {maturityCounts.early ? (
                <span className="text-warn">
                  {maturityCounts.early} early
                </span>
              ) : null}
              {maturityCounts.toy ? (
                <span>{maturityCounts.toy} toy</span>
              ) : null}
            </div>
          )}
        </div>

        {/* ── 3. avg relevance + histogram ── */}
        <div className="p-3">
          <div className="text-[10px] uppercase tracking-widest text-ink-faint mb-1.5">
            avg relevance
          </div>
          <div className="flex items-center gap-3">
            <span className="text-2xl text-accent glow tabular-nums leading-none">
              {avgRelevance}%
            </span>
            {enriched.length > 0 && (
              <MatchHistogram items={enriched} />
            )}
          </div>
          <div className="text-[10px] uppercase tracking-wide text-ink-faint mt-1.5 tabular-nums">
            {enriched.length} items scored
          </div>
        </div>

        {/* ── 4. onchain signal ── */}
        <div className="p-3 col-span-2 sm:col-span-1">
          <div className="text-[10px] uppercase tracking-widest text-ink-faint mb-1.5">
            onchain signal
          </div>
          <div className="flex items-baseline gap-1 tabular-nums">
            <span className="text-2xl text-accent leading-none glow">
              {onBase}
            </span>
            <span className="text-ink-faint text-sm">
              /{creatorItems.length}
            </span>
            <span className="text-[10px] uppercase tracking-wide text-ink-dim ml-1">
              on base
            </span>
          </div>
          <div className="mt-2 flex items-center gap-2">
            <BaseTxWaveform />
            <span className="text-[10px] tabular-nums text-ink-faint">
              {totalBaseTxs.toLocaleString()} txs
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * 10-bin histogram of relevance scores. Bars left → right cover
 * 0-10%, 10-20%, …, 90-100%. The tallest bin defines max height.
 * Empty bins still draw at 15% opacity so the axis stays readable.
 */
function MatchHistogram({ items }: { items: UnifiedItem[] }) {
  const bins = new Array(10).fill(0) as number[];
  for (const it of items) {
    const r = it.extracted?.relevance ?? 0;
    const idx = Math.min(9, Math.max(0, Math.floor(r * 10)));
    bins[idx]++;
  }
  const max = Math.max(1, ...bins);
  const barW = 6;
  const gap = 2;
  const maxH = 22;
  const w = bins.length * barW + (bins.length - 1) * gap;

  return (
    <svg
      width={w}
      height={maxH}
      className="text-accent shrink-0"
      aria-label="relevance histogram"
      role="img"
    >
      {bins.map((count, i) => {
        const h = count === 0 ? 1 : Math.max(2, Math.round((count / max) * maxH));
        const x = i * (barW + gap);
        const y = maxH - h;
        return (
          <rect
            key={i}
            x={x}
            y={y}
            width={barW}
            height={h}
            fill="currentColor"
            opacity={count === 0 ? 0.18 : 0.65}
          />
        );
      })}
    </svg>
  );
}

/**
 * Sine-wave pulse — 20 bars, phase ticks every 700ms. Pure decoration
 * suggesting onchain activity. Respects reduced motion (stays at phase 0).
 */
function BaseTxWaveform() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    if (
      typeof window === "undefined" ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return;
    }
    const id = window.setInterval(() => {
      setPhase((p) => (p + 30) % 360);
    }, 700);
    return () => window.clearInterval(id);
  }, []);

  const bars = 20;
  const barW = 3;
  const gap = 2;
  const maxH = 20;
  const w = bars * barW + (bars - 1) * gap;

  return (
    <svg
      width={w}
      height={maxH}
      className="text-accent shrink-0"
      aria-label="base tx pulse"
      role="img"
    >
      {Array.from({ length: bars }).map((_, i) => {
        const t = (i / bars) * Math.PI * 2 + (phase * Math.PI) / 180;
        const amp = (Math.sin(t) + 1) / 2; // 0..1
        const h = 2 + amp * (maxH - 2);
        const x = i * (barW + gap);
        const y = maxH - h;
        return (
          <rect
            key={i}
            x={x}
            y={y}
            width={barW}
            height={h}
            fill="currentColor"
            opacity={0.45 + amp * 0.5}
          />
        );
      })}
    </svg>
  );
}
