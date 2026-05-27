"use client";

import AsciiLogo from "./ascii-logo";
import TypingPrompt from "./typing-prompt";
import SystemStream from "./system-stream";
import OnchainPulse from "./onchain-pulse";
import HeroTags from "./hero-tags";
import HowItWorks from "./how-it-works";

type Props = {
  query: string;
  onQueryChange: (q: string) => void;
  onSubmit: () => void;
  onPick: (query: string) => void;
  signedIn: boolean;
};

/**
 * Landing hero — an "agent observatory" shown when there are no results yet.
 * Big logo, live system stream, base pulse, and a typing prompt that cycles
 * through example queries. Once a search runs, the parent unmounts this and
 * renders the working layout.
 */
export default function HeroSection({
  query,
  onQueryChange,
  onSubmit,
  onPick,
  signedIn,
}: Props) {
  return (
    <div className="px-4 lg:px-6 py-10 lg:py-14">
      {/* big logo */}
      <div className="flex justify-center">
        <AsciiLogo glitch />
      </div>

      <p className="text-center text-ink-dim text-sm mt-5">
        <span className="text-accent glow">{"//"}</span> agent-curated discovery
        for builders on Base
      </p>
      <p className="text-center text-ink-faint text-xs mt-1">
        reads github · hn · reddit · cross-links to farcaster + base onchain
      </p>

      {/* search prompt */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (query.trim().length >= 2) onSubmit();
        }}
        className="max-w-3xl mx-auto mt-10 lg:mt-14"
      >
        <div className="text-[10px] uppercase tracking-widest text-ink-faint mb-2">
          {"⌄"} what do you want to build?
        </div>
        <div className="flex items-stretch border border-rule focus-within:border-accent transition-colors">
          <span className="px-3 py-3 text-accent glow border-r border-rule flex items-center select-none">
            discover&gt;
          </span>
          <TypingPrompt
            value={query}
            onChange={onQueryChange}
            onSubmit={onSubmit}
          />
          <button
            type="submit"
            disabled={query.trim().length < 2}
            className="px-5 py-3 border-l border-rule text-accent hover:bg-accent hover:text-screen disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-accent transition-colors"
          >
            run ↵
          </button>
        </div>

      </form>

      <HeroTags onPick={onPick} />

      {!signedIn && (
        <p className="mt-6 text-[11px] text-ink-faint text-center max-w-3xl mx-auto">
          <span className="text-accent">{"//"}</span> sign in (top right) to
          persist history and personalize ranking
        </p>
      )}

      {/* live panels */}
      <div className="mt-12 lg:mt-16 grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(360px,440px)] gap-6 max-w-6xl mx-auto">
        <SystemStream />
        <OnchainPulse />
      </div>

      {/* explainer cards */}
      <HowItWorks />
    </div>
  );
}
