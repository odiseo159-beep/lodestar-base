"use client";

/**
 * Status-bar theme toggle. Cycles between dark (default) and light by
 * flipping `data-theme` on <html>. Persists to localStorage under
 * `lodestar.theme`. The inline boot script in layout.tsx applies the
 * stored value before hydration so users never see a flash.
 */
import { useEffect, useState } from "react";

type Theme = "dark" | "light";

export default function ThemeToggle() {
  // We hydrate from the DOM attribute the inline script wrote, falling
  // back to "dark" only on the first render of an unbooted user.
  const [theme, setTheme] = useState<Theme>("dark");

  useEffect(() => {
    const current =
      (document.documentElement.getAttribute("data-theme") as Theme | null) ??
      "dark";
    setTheme(current);
  }, []);

  function toggle() {
    const next: Theme = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.setAttribute("data-theme", next);
    try {
      localStorage.setItem("lodestar.theme", next);
    } catch {
      // ignore storage failures (private mode, etc.)
    }
  }

  return (
    <button
      onClick={toggle}
      title={`switch to ${theme === "dark" ? "light" : "dark"} mode`}
      className="text-ink-dim hover:text-accent transition-colors tabular-nums tracking-wide"
    >
      {theme === "dark" ? "[◐ dark]" : "[◑ light]"}
    </button>
  );
}
