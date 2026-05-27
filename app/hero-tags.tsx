"use client";

import { HERO_CATEGORIES, type HeroChip } from "@/lib/tags";

type Props = {
  onPick: (query: string) => void;
};

/**
 * Quick-start category chips for the hero. Click a chip → seed the search
 * input with the chip's query and submit. Pre-defined to lower friction for
 * users who don't yet know what to search.
 */
export default function HeroTags({ onPick }: Props) {
  return (
    <div className="mt-6 max-w-3xl mx-auto">
      <div className="text-[10px] uppercase tracking-widest text-ink-faint mb-3 flex items-center gap-2">
        <span className="text-accent">▸</span> quick start
        <span className="text-ink-faint">
          {"// "}or type your own query above
        </span>
      </div>

      <div className="space-y-2 text-[11px]">
        {HERO_CATEGORIES.map((cat) => (
          <div key={cat.title} className="flex items-start gap-3 flex-wrap">
            <span className="text-ink-faint uppercase tracking-widest shrink-0 w-16 pt-1">
              {cat.title}
            </span>
            <div className="flex flex-wrap gap-1.5">
              {cat.chips.map((chip) => (
                <ChipButton
                  key={chip.label}
                  chip={chip}
                  onPick={onPick}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ChipButton({
  chip,
  onPick,
}: {
  chip: HeroChip;
  onPick: (query: string) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onPick(chip.query)}
      className="px-2 py-0.5 border border-rule text-ink-dim hover:text-accent hover:border-accent transition-colors text-[11px]"
      title={chip.query}
    >
      {chip.label}
    </button>
  );
}
