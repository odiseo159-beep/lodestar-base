"use client";

import { useEffect, useState } from "react";

const BOOT_LINES: Array<{ text: string; tone: "accent" | "ink" | "grow" | "ink-dim"; delay: number }> = [
  { text: "lodestar v0.1 booting...", tone: "accent", delay: 0 },
  { text: "[....] scanning sources: github · hn · reddit", tone: "ink-dim", delay: 220 },
  { text: "[ OK ] connecting to base mainnet (chain 8453)", tone: "grow", delay: 480 },
  { text: "[ OK ] loading agent: claude-sonnet-4-5", tone: "grow", delay: 720 },
  { text: "[ OK ] session: anonymous", tone: "grow", delay: 940 },
  { text: "ready_", tone: "accent", delay: 1180 },
];

const TONE_CLASS: Record<(typeof BOOT_LINES)[number]["tone"], string> = {
  accent: "text-accent glow",
  ink: "text-ink",
  grow: "text-grow",
  "ink-dim": "text-ink-dim",
};

const SESSION_KEY = "lodestar.booted";
const TOTAL_MS = 1700;

export default function BootSequence({
  children,
}: {
  children: React.ReactNode;
}) {
  /** undefined = not decided yet (hydration); false = play; true = skip */
  const [done, setDone] = useState<boolean | undefined>(undefined);
  const [visible, setVisible] = useState(0);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    let seen = false;
    try {
      seen = sessionStorage.getItem(SESSION_KEY) === "1";
    } catch {
      // sessionStorage blocked — play anyway, just don't memoize
    }

    if (seen) {
      setDone(true);
      return;
    }

    setDone(false);

    const timers = BOOT_LINES.map((line, i) =>
      window.setTimeout(() => setVisible(i + 1), line.delay)
    );
    const fadeTimer = window.setTimeout(() => setFading(true), TOTAL_MS - 200);
    const finishTimer = window.setTimeout(() => {
      try {
        sessionStorage.setItem(SESSION_KEY, "1");
      } catch {}
      setDone(true);
    }, TOTAL_MS);

    const skip = () => {
      try {
        sessionStorage.setItem(SESSION_KEY, "1");
      } catch {}
      setDone(true);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" || e.key === "Enter" || e.key === " ") skip();
    };
    window.addEventListener("click", skip, { once: true });
    window.addEventListener("keydown", onKey);

    return () => {
      timers.forEach((t) => window.clearTimeout(t));
      window.clearTimeout(fadeTimer);
      window.clearTimeout(finishTimer);
      window.removeEventListener("click", skip);
      window.removeEventListener("keydown", onKey);
    };
  }, []);

  // During SSR or while deciding, render children so first paint matches markup.
  if (done !== false) return <>{children}</>;

  return (
    <>
      <div
        className={`fixed inset-0 z-[200] bg-screen flex items-center justify-center transition-opacity duration-200 ${
          fading ? "opacity-0" : "opacity-100"
        }`}
        aria-hidden
      >
        <div className="font-mono text-xs sm:text-sm leading-relaxed w-full max-w-xl px-6">
          {BOOT_LINES.slice(0, visible).map((line, i) => (
            <div
              key={i}
              className={`${TONE_CLASS[line.tone]} anim-reveal`}
              style={{ animationDelay: "0ms" }}
            >
              {"> "}
              {line.text}
            </div>
          ))}
          {visible > 0 && visible < BOOT_LINES.length && (
            <span className="term-cursor" />
          )}
          <div className="mt-4 text-[10px] text-ink-faint uppercase tracking-widest">
            [click / esc to skip]
          </div>
        </div>
      </div>
      {children}
    </>
  );
}
