"use client";

import { useEffect, useRef, useState } from "react";

type EventType = "info" | "ok" | "agent" | "base";

type StreamEvent = {
  id: number;
  time: string;
  type: EventType;
  message: string;
};

const TYPE_COLOR: Record<EventType, string> = {
  info: "text-ink-dim",
  ok: "text-grow",
  agent: "text-accent",
  base: "text-warn",
};

const REPOS = [
  "vercel/next.js",
  "anthropic-ai/sdk-python",
  "coinbase/agentkit",
  "framesjs/frames.js",
  "ethers-io/ethers.js",
  "wevm/viem",
  "wevm/wagmi",
  "openzeppelin/contracts",
  "rainbow-me/rainbowkit",
  "uniswap/v4-core",
];

const USERS = [
  "dwr",
  "transmissions11",
  "jessepollak",
  "vitalik",
  "balajis",
  "cdixon",
  "stani",
  "0xparis",
  "rabbitholegg",
  "linda",
];

const QUERIES = [
  "ai agents",
  "x402",
  "farcaster frame",
  "base agent",
  "defi looping",
  "onchain identity",
  "perp dex",
  "intent solver",
  "yield optimizer",
  "mev bot",
];

const STACKS = [
  "TypeScript, viem",
  "Python, Solidity",
  "Rust, Foundry",
  "Go, Hardhat",
  "TypeScript, Wagmi",
  "Python, ethers",
];

const TEMPLATES: Array<{ type: EventType; build: () => string }> = [
  {
    type: "info",
    build: () => `indexing repo: ${pick(REPOS)} (★ ${rand(50, 240000).toLocaleString()})`,
  },
  {
    type: "agent",
    build: () => `resolving farcaster: @${pick(USERS)} → fid ${rand(1, 9999)}`,
  },
  {
    type: "base",
    build: () =>
      `scanning base addr: 0x${randomHex(8)}... (${rand(1, 47)} verified contracts)`,
  },
  {
    type: "agent",
    build: () => `curating q="${pick(QUERIES)}" via claude-sonnet-4-5`,
  },
  {
    type: "ok",
    build: () => `cache hit: ${rand(3, 12)}/${rand(13, 24)} items (${rand(180, 720)}ms saved)`,
  },
  {
    type: "agent",
    build: () =>
      `extracted: ${pick(REPOS)} → stack=[${pick(STACKS)}] novelty=${rand(1, 10)}`,
  },
  {
    type: "info",
    build: () =>
      `scoring item against profile · relevance ${rand(40, 99)}% · novelty ${rand(2, 9)}/10`,
  },
  {
    type: "agent",
    build: () => `ranked ${rand(12, 30)} items in ${rand(280, 1840)}ms`,
  },
  {
    type: "base",
    build: () =>
      `base block #${rand(23000000, 24000000).toLocaleString()} sealed (${rand(20, 80)} contracts)`,
  },
  {
    type: "info",
    build: () => `@${pick(USERS)} just queried "${pick(QUERIES)}"`,
  },
  {
    type: "ok",
    build: () =>
      `creator profile cached: @${pick(USERS)}.base (${rand(1, 14)} contracts on base)`,
  },
  {
    type: "agent",
    build: () => `plan: discover → enrich(creator) → extract(llm) → score → rank`,
  },
];

const VISIBLE = 12;
let nextId = 1;

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function rand(min: number, max: number): number {
  return Math.floor(min + Math.random() * (max - min + 1));
}

function randomHex(n: number): string {
  let s = "";
  for (let i = 0; i < n; i++) {
    s += Math.floor(Math.random() * 16).toString(16);
  }
  return s;
}

function generateEvent(now: Date): StreamEvent {
  const tpl = pick(TEMPLATES);
  const hh = String(now.getHours()).padStart(2, "0");
  const mm = String(now.getMinutes()).padStart(2, "0");
  const ss = String(now.getSeconds()).padStart(2, "0");
  return {
    id: nextId++,
    time: `${hh}:${mm}:${ss}`,
    type: tpl.type,
    message: tpl.build(),
  };
}

export default function SystemStream() {
  const [events, setEvents] = useState<StreamEvent[]>([]);
  const [eventsPerMin, setEventsPerMin] = useState(0);
  const recentTimestamps = useRef<number[]>([]);

  useEffect(() => {
    // Seed with a flurry of starter events so the panel isn't empty
    const seed: StreamEvent[] = [];
    const start = new Date();
    for (let i = 0; i < VISIBLE; i++) {
      seed.push(generateEvent(new Date(start.getTime() - (VISIBLE - i) * 1500)));
    }
    setEvents(seed);
    recentTimestamps.current = seed.map((_, i) => Date.now() - (VISIBLE - i) * 1500);

    // Then add new ones at jittered intervals
    let cancelled = false;
    function schedule() {
      if (cancelled) return;
      const delay = 600 + Math.random() * 1400;
      window.setTimeout(() => {
        if (cancelled) return;
        const now = Date.now();
        recentTimestamps.current = [...recentTimestamps.current, now].filter(
          (t) => now - t < 60_000
        );
        setEventsPerMin(recentTimestamps.current.length);
        setEvents((prev) => {
          const next = [...prev, generateEvent(new Date())];
          return next.slice(-VISIBLE * 2);
        });
        schedule();
      }, delay);
    }
    schedule();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="border border-rule">
      <header className="bg-screen-2 border-b border-rule px-3 py-1.5 text-[10px] uppercase tracking-widest text-ink-faint flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-accent glow">●</span>
          <span>system activity</span>
        </div>
        <div className="text-ink-faint tabular-nums">
          live · {eventsPerMin || "—"} ev/min
        </div>
      </header>
      <div className="relative h-[260px] overflow-hidden">
        <div className="absolute inset-x-0 bottom-0 flex flex-col-reverse">
          {[...events].reverse().map((e, i) => (
            <div
              key={e.id}
              className="px-3 py-0.5 text-[11px] flex gap-2 anim-reveal whitespace-nowrap overflow-hidden"
              style={{
                opacity: Math.max(0.15, 1 - i * 0.07),
              }}
            >
              <span className="text-ink-faint tabular-nums shrink-0">
                [{e.time}]
              </span>
              <span className={`${TYPE_COLOR[e.type]} truncate`}>{e.message}</span>
            </div>
          ))}
        </div>
        {/* fade-out gradient at the top */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-12 bg-gradient-to-b from-screen to-transparent" />
      </div>
    </div>
  );
}
