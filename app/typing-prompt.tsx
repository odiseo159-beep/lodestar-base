"use client";

import { useEffect, useRef, useState } from "react";

const EXAMPLES = [
  "a tipping agent on base",
  "x402 payment gateway",
  "farcaster frame builder",
  "base mini-app boilerplate",
  "defi looping strategy",
  "agent that bridges between L2s",
  "onchain credentials verifier",
  "viem starter with permit2",
  "claude agent that ships PRs",
];

type Props = {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
};

/**
 * Search input whose placeholder types itself, cycling through example
 * queries. Pauses when the user focuses the input. Disappears once they
 * type a real value.
 */
export default function TypingPrompt({ value, onChange, onSubmit }: Props) {
  const [placeholder, setPlaceholder] = useState("");
  const [focused, setFocused] = useState(false);
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (focused || value.length > 0) {
      setPlaceholder("");
      return;
    }

    let cancelled = false;
    let idx = 0;
    let charPos = 0;
    let phase: "type" | "hold" | "erase" = "type";
    let timer: number | undefined;

    function step() {
      if (cancelled) return;
      const target = EXAMPLES[idx];
      let nextDelay = 60;

      if (phase === "type") {
        if (charPos < target.length) {
          charPos++;
          setPlaceholder(target.slice(0, charPos));
        } else {
          phase = "hold";
          nextDelay = 1700;
        }
      } else if (phase === "hold") {
        phase = "erase";
        nextDelay = 30;
      } else {
        if (charPos > 0) {
          charPos--;
          setPlaceholder(target.slice(0, charPos));
          nextDelay = 25;
        } else {
          idx = (idx + 1) % EXAMPLES.length;
          phase = "type";
          nextDelay = 250;
        }
      }
      timer = window.setTimeout(step, nextDelay);
    }
    step();

    return () => {
      cancelled = true;
      if (timer) window.clearTimeout(timer);
    };
  }, [focused, value]);

  return (
    <input
      ref={ref}
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      onKeyDown={(e) => {
        if (e.key === "Enter" && value.trim().length >= 2) {
          onSubmit();
        }
      }}
      placeholder={placeholder + (placeholder ? "_" : "")}
      className="flex-1 px-4 py-3 bg-screen text-ink placeholder:text-ink-dim focus:outline-none"
      autoComplete="off"
      spellCheck={false}
    />
  );
}

export { EXAMPLES };
