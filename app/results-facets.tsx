"use client";

/**
 * ResultsFacets — auto-extracted filter chips for the working-mode results.
 *
 * Chips are organized into rows by category. Within a category the filter
 * is OR (any selected value passes); across categories it's AND. This is
 * reinforced visually with the inline `OR within · AND across` hint and
 * via an active `●` marker on each engaged chip.
 */
import { useMemo } from "react";
import { computeFacets, type FacetCategory, type FacetKey } from "@/lib/tags";
import type { UnifiedItem } from "@/lib/sources/types";

type Props = {
  items: UnifiedItem[];
  activeKeys: Set<FacetKey>;
  onToggle: (key: FacetKey) => void;
  onClear: () => void;
  filteredCount: number;
};

const CATEGORY_ORDER: Array<{ key: FacetCategory; label: string }> = [
  { key: "source", label: "source" },
  { key: "maturity", label: "maturity" },
  { key: "chain", label: "chain" },
  { key: "ai", label: "ai tech" },
  { key: "stack", label: "stack" },
  { key: "onchain", label: "onchain" },
];

export default function ResultsFacets({
  items,
  activeKeys,
  onToggle,
  onClear,
  filteredCount,
}: Props) {
  const facets = useMemo(() => computeFacets(items), [items]);
  const hasAnyActive = activeKeys.size > 0;
  const total = items.length;

  const visibleCategories = CATEGORY_ORDER.filter(
    (c) => facets[c.key].length > 0
  );

  if (visibleCategories.length === 0) return null;

  return (
    <div className="mb-6 border border-rule">
      {/* ── header bar ── */}
      <div className="bg-screen-2 border-b border-rule px-3 py-1.5 text-[10px] uppercase tracking-widest flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 text-ink-faint">
          <span className="text-accent">▸</span>
          <span>filters</span>
          <span className="text-ink-dim">·</span>
          <span className="text-ink-dim normal-case tracking-normal">
            <span className="text-accent">OR</span> within ·{" "}
            <span className="text-accent">AND</span> across
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-ink-faint tabular-nums">
            {hasAnyActive ? (
              <>
                <span className="text-accent">{activeKeys.size}</span> active ·
                showing{" "}
                <span className="text-accent">{filteredCount}</span>/
                {total}
              </>
            ) : (
              <>
                <span className="text-ink-dim">{total}</span> items · click
                to filter
              </>
            )}
          </span>
          {hasAnyActive && (
            <button
              onClick={onClear}
              className="text-ink-dim hover:text-err transition-colors tracking-wide"
            >
              [× clear]
            </button>
          )}
        </div>
      </div>

      {/* ── rows ── */}
      <div className="px-3 py-2.5 space-y-1.5">
        {visibleCategories.map((c) => (
          <div
            key={c.key}
            className="flex items-start gap-3 flex-wrap text-[11px]"
          >
            <span className="text-ink-faint uppercase tracking-widest shrink-0 w-16 pt-0.5">
              {c.label}
            </span>
            <div className="flex flex-wrap gap-1">
              {facets[c.key].map((f) => {
                const key: FacetKey = `${f.category}:${f.value}`;
                const active = activeKeys.has(key);
                return (
                  <button
                    key={key}
                    onClick={() => onToggle(key)}
                    className={`px-1.5 py-0.5 border transition-colors text-[11px] tabular-nums inline-flex items-center gap-1 ${
                      active
                        ? "border-accent bg-accent/15 text-accent glow"
                        : "border-rule text-ink-dim hover:text-ink hover:border-rule-hot"
                    }`}
                  >
                    <span
                      className={
                        active ? "text-accent" : "text-ink-faint"
                      }
                    >
                      {active ? "●" : f.count}
                    </span>
                    {f.value}
                    {active && (
                      <span className="text-ink-faint text-[10px]">
                        {f.count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
