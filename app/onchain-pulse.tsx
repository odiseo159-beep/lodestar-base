"use client";

import { useEffect, useState } from "react";

const WAVE_CHARS = ["▁", "▂", "▃", "▄", "▅", "▆", "▇", "█"];
const WAVE_LEN = 32;

const TOP_BUILDERS: Array<{ handle: string; score: number; delta: number }> = [
  { handle: "transmissions11.eth", score: 847, delta: 12 },
  { handle: "jessepollak.eth", score: 724, delta: 8 },
  { handle: "dwr.eth", score: 691, delta: -3 },
  { handle: "0xparis.base.eth", score: 612, delta: 41 },
  { handle: "wbnns.base.eth", score: 588, delta: 5 },
];

function generateWaveform(phase: number): string {
  return Array.from({ length: WAVE_LEN }, (_, i) => {
    const t = ((i + phase) / WAVE_LEN) * Math.PI * 2;
    const v =
      (Math.sin(t * 2) +
        Math.sin(t * 3.7) * 0.45 +
        Math.sin(t * 5.3) * 0.2 +
        1.65) /
      3.3;
    const idx = Math.max(
      0,
      Math.min(WAVE_CHARS.length - 1, Math.floor(v * WAVE_CHARS.length))
    );
    return WAVE_CHARS[idx];
  }).join("");
}

export default function OnchainPulse() {
  const [phase, setPhase] = useState(0);
  const [block, setBlock] = useState(23_456_789);
  const [gas, setGas] = useState(12.4);
  const [contractsPerMin, setContractsPerMin] = useState(47);

  useEffect(() => {
    const waveTick = window.setInterval(() => {
      setPhase((p) => (p + 1) % 256);
    }, 110);
    const dataTick = window.setInterval(() => {
      setBlock((b) => b + 1 + Math.floor(Math.random() * 3));
      setGas((g) => clamp(g + (Math.random() - 0.5) * 1.6, 5, 80));
      setContractsPerMin((c) => clamp(c + Math.floor((Math.random() - 0.5) * 6), 18, 92));
    }, 2200);
    return () => {
      window.clearInterval(waveTick);
      window.clearInterval(dataTick);
    };
  }, []);

  const waveform = generateWaveform(phase);

  return (
    <div className="border border-rule">
      <header className="bg-screen-2 border-b border-rule px-3 py-1.5 text-[10px] uppercase tracking-widest text-ink-faint flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-accent glow">●</span>
          <span>base pulse</span>
        </div>
        <div className="text-ink-faint">chain 8453 · mainnet</div>
      </header>

      <div className="px-3 py-3">
        <div className="flex items-baseline justify-between text-[11px]">
          <span className="text-ink-faint uppercase tracking-widest">block</span>
          <span className="text-ink tabular-nums">
            #{block.toLocaleString()}
          </span>
        </div>

        <div className="my-2 text-accent glow font-mono text-base leading-none tracking-tight tabular-nums select-none">
          {waveform}
        </div>

        <div className="flex items-baseline justify-between text-[11px] text-ink-dim">
          <span>
            gas <span className="text-ink tabular-nums">{gas.toFixed(1)}</span>{" "}
            gwei
          </span>
          <span>
            <span className="text-ink tabular-nums">~{contractsPerMin}</span>{" "}
            contracts/min
          </span>
        </div>
      </div>

      <div className="border-t border-rule px-3 py-3">
        <div className="text-[10px] uppercase tracking-widest text-ink-faint mb-2 flex items-center justify-between">
          <span>top builders · 7d</span>
          <span className="text-ink-faint">via talent · mock</span>
        </div>
        <ol className="space-y-0.5 text-[11px]">
          {TOP_BUILDERS.map((b, i) => (
            <li
              key={b.handle}
              className="flex items-center justify-between gap-2"
            >
              <span className="flex items-center gap-2 min-w-0">
                <span className="text-ink-faint tabular-nums shrink-0">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="text-ink truncate">@{b.handle}</span>
              </span>
              <span className="flex items-center gap-2 shrink-0">
                <span className="text-accent tabular-nums">{b.score}</span>
                <span
                  className={`tabular-nums text-[10px] ${b.delta >= 0 ? "text-grow" : "text-err"}`}
                >
                  {b.delta >= 0 ? "+" : ""}
                  {b.delta}
                </span>
              </span>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}
