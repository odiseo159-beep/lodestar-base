"use client";

import { useEffect, useState } from "react";

const SLOTS = 14;

/**
 * Indeterminate progress bar in ASCII. Block slides back and forth with a
 * trailing fade — gives the agent's "thinking" a real terminal feel.
 */
export default function AsciiProgress({ label }: { label?: string }) {
  const [pos, setPos] = useState(0);
  const [dir, setDir] = useState<1 | -1>(1);

  useEffect(() => {
    let mounted = true;
    let p = 0;
    let d: 1 | -1 = 1;
    const tick = () => {
      if (!mounted) return;
      if (p >= SLOTS - 1) d = -1;
      else if (p <= 0) d = 1;
      p += d;
      setPos(p);
      setDir(d);
    };
    const id = window.setInterval(tick, 90);
    return () => {
      mounted = false;
      window.clearInterval(id);
    };
  }, []);

  const slots: string[] = Array(SLOTS).fill("░");
  slots[pos] = "█";
  if (pos - dir >= 0 && pos - dir < SLOTS) slots[pos - dir] = "▓";
  if (pos - dir * 2 >= 0 && pos - dir * 2 < SLOTS) slots[pos - dir * 2] = "▒";

  return (
    <span className="font-mono">
      <span className="text-ink-faint">[</span>
      <span className="text-accent glow">{slots.join("")}</span>
      <span className="text-ink-faint">]</span>
      {label && <span className="ml-2 text-ink-dim">{label}</span>}
    </span>
  );
}
