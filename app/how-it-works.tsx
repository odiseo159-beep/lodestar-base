"use client";

/**
 * HowItWorks — 3-card explainer shown in the hero, below the live panels.
 *
 * Each card animates its own preview to give the user a sense of what
 * happens at that stage without forcing them to start a search:
 *   01  TYPING       — cycling placeholder queries (same vibe as TypingPrompt)
 *   02  AGENT READS  — sources cycling, mock streaming feed
 *   03  SCAFFOLD     — file tree fading in line-by-line
 *
 * All animations respect prefers-reduced-motion.
 */
import { useEffect, useState } from "react";

const EXAMPLE_QUERIES = [
  "ai agents on base",
  "x402 payments",
  "claude code mcp server",
  "farcaster frame v2",
  "smart wallet sdk",
];

const EXAMPLE_SOURCES = [
  "github · search?q=ai+agent",
  "hn · algolia top-stories",
  "reddit · r/ethdev hot",
  "farcaster · @cyfrin",
  "basescan · contracts(0x…)",
];

const EXAMPLE_FILES = [
  "package.json",
  "README.md",
  "src/index.ts",
  "src/agent.ts",
  "src/tools/onchain.ts",
  ".env.example",
];

export default function HowItWorks() {
  return (
    <section className="mt-12 lg:mt-16 max-w-6xl mx-auto">
      <div className="text-[10px] uppercase tracking-widest text-ink-faint mb-3 flex items-center gap-2">
        <span className="text-accent">▸</span> how it works
        <span className="text-ink-faint">·</span>
        <span className="text-ink-dim normal-case tracking-normal">
          three stages, one prompt
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Card num="01" title="type a query">
          <TypingDemo />
          <p className="mt-3 text-[11px] text-ink-dim leading-relaxed">
            chain · ai tech · kind. the agent reads your{" "}
            <span className="text-accent">profile</span> and personalizes the
            ranking.
          </p>
        </Card>

        <Card num="02" title="agent reads sources">
          <SourcesDemo />
          <p className="mt-3 text-[11px] text-ink-dim leading-relaxed">
            github · hn · reddit in parallel · cross-links creators to{" "}
            <span className="text-accent">farcaster</span> +{" "}
            <span className="text-accent">base</span>.
          </p>
        </Card>

        <Card num="03" title="get a scaffold">
          <FilesDemo />
          <p className="mt-3 text-[11px] text-ink-dim leading-relaxed">
            queue picks · top-5 by default. agent returns a runnable starter
            with real <span className="text-accent">deps</span>.
          </p>
        </Card>
      </div>
    </section>
  );
}

function Card({
  num,
  title,
  children,
}: {
  num: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="border border-rule p-4 bg-screen hover:border-rule-hot transition-colors">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-accent tabular-nums text-sm glow">{num}</span>
        <span className="text-ink-faint">/</span>
        <span className="text-xs uppercase tracking-widest text-ink">
          {title}
        </span>
      </div>
      {children}
    </div>
  );
}

function TypingDemo() {
  const [idx, setIdx] = useState(0);
  const [chars, setChars] = useState(0);

  useEffect(() => {
    if (
      typeof window === "undefined" ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return;
    }
    const target = EXAMPLE_QUERIES[idx].length;
    if (chars < target) {
      const id = window.setTimeout(() => setChars((c) => c + 1), 70);
      return () => window.clearTimeout(id);
    }
    const hold = window.setTimeout(() => {
      setIdx((i) => (i + 1) % EXAMPLE_QUERIES.length);
      setChars(0);
    }, 1800);
    return () => window.clearTimeout(hold);
  }, [idx, chars]);

  const text = EXAMPLE_QUERIES[idx].slice(0, chars);

  return (
    <div className="border border-rule px-2 py-2 bg-screen-2/60 font-mono text-[12px] flex items-center gap-2 h-9">
      <span className="text-accent glow">discover&gt;</span>
      <span className="text-ink">{text}</span>
      <span className="term-cursor" />
    </div>
  );
}

function SourcesDemo() {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (
      typeof window === "undefined" ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return;
    }
    const id = window.setInterval(() => setTick((t) => t + 1), 900);
    return () => window.clearInterval(id);
  }, []);

  // Show 3 most recent lines as a sliding window
  const window3 = Array.from({ length: 3 }).map(
    (_, i) =>
      EXAMPLE_SOURCES[(tick + i) % EXAMPLE_SOURCES.length]
  );

  return (
    <div className="border border-rule bg-screen-2/60 px-2 py-2 h-[5.4rem] overflow-hidden text-[11px] font-mono space-y-1">
      {window3.map((line, i) => (
        <div
          key={`${tick}-${i}`}
          className={`flex items-center gap-2 anim-reveal ${
            i === 2 ? "text-ink" : "text-ink-dim"
          }`}
          style={{ animationDelay: `${i * 40}ms` }}
        >
          <span className={i === 2 ? "text-accent" : "text-ink-faint"}>
            ▸
          </span>
          <span className="truncate">{line}</span>
        </div>
      ))}
    </div>
  );
}

function FilesDemo() {
  const [visible, setVisible] = useState(0);

  useEffect(() => {
    if (
      typeof window === "undefined" ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      setVisible(EXAMPLE_FILES.length);
      return;
    }
    const id = window.setInterval(() => {
      setVisible((v) => (v >= EXAMPLE_FILES.length ? 0 : v + 1));
    }, 420);
    return () => window.clearInterval(id);
  }, []);

  return (
    <div className="border border-rule bg-screen-2/60 px-2 py-2 h-[5.4rem] overflow-hidden text-[11px] font-mono">
      <ul>
        {EXAMPLE_FILES.slice(0, 3).map((f, i) => (
          <li
            key={f}
            className={`flex items-center gap-2 transition-opacity ${
              i < visible ? "opacity-100" : "opacity-25"
            }`}
          >
            <span className="text-accent">▸</span>
            <span className="text-ink-dim">{f}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
