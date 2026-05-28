"use client";

/**
 * PixelMascot — a chunky bitmap sentinel rendered as a real pixel grid.
 * Ported from the Claude Design `mascot.jsx` handoff. No images, no SVG —
 * just divs, so it stays crisp at any pixel scale. Honors the theme accent
 * (via `var(--accent)`) and idles with subtle life:
 *   · slow blink on the eye cells
 *   · pulsing antenna tip
 *   · breathing chest segment
 *
 * Animations live in globals.css (.lds-mascot-antenna / .lds-mascot-chest)
 * and respect prefers-reduced-motion.
 */
import { useEffect, useMemo, useState } from "react";

// ──────────────────────────────────────────────────────────────────────
// PATTERN — 23 cols × 28 rows. '#' filled, '.' empty.
// Symmetric around col 11: antenna → pyramid cap → square head with brow +
// eyes → bracket arms with floating sensor-dots → tapered neck → splayed
// legs + exhaust pixels.
// ──────────────────────────────────────────────────────────────────────
const MASCOT_PATTERN = [
  "...........#...........", //  0  antenna tip
  ".......................", //  1
  "...........#...........", //  2  stem
  "..........###..........", //  3  pyramid cap
  ".........#####.........", //  4
  ".........#####.........", //  5
  ".......#########.......", //  6  head top
  ".......#.......#.......", //  7  head outline
  ".#.....#.......#.....#.", //  8  outer sensor dots
  "####...##.....##...####", //  9  arms: bracket left + right
  "#..#...#.......#...#..#", // 10
  "#..#...#.#...#.#...#..#", // 11  eye row (cols 9, 13)
  "####...##.....##...####", // 12
  ".#.....#.......#.....#.", // 13
  ".......#########.......", // 14  head bottom
  "........#######........", // 15  shoulders
  ".........#####.........", // 16
  "..........###..........", // 17  neck
  "..........###..........", // 18
  ".........#####.........", // 19  hip
  "........##.#.##........", // 20
  ".......#...#...#.......", // 21  legs split
  "......#...#.#...#......", // 22
  ".....#...#...#...#.....", // 23
  "....#.....#.#.....#....", // 24
  "...#......#.#......#...", // 25
  ".......................", // 26
  "...#...............#...", // 27  exhaust dots
];

const ROWS = MASCOT_PATTERN.length;
const COLS = MASCOT_PATTERN[0].length;

// Cells with special behavior, keyed by `r-c`.
const EYE_CELLS = new Set(["11-9", "11-13"]);
const ANTENNA_CELLS = new Set(["0-11"]);
const CHEST_CELLS = new Set([
  "17-10", "17-11", "17-12",
  "18-10", "18-11", "18-12",
]);

type Props = {
  /** Size of one cell in px (mascot is 23×28 cells). */
  pixel?: number;
  /** Override fill color. Defaults to the theme accent. */
  color?: string;
  /** Run idle animations (eye blink, antenna pulse, chest breath). */
  idle?: boolean;
  /** Add a soft accent halo behind the head. */
  glow?: boolean;
  ariaLabel?: string;
  className?: string;
};

export default function PixelMascot({
  pixel = 4,
  color,
  idle = true,
  glow = true,
  ariaLabel = "lodestar mascot",
  className,
}: Props) {
  const fill = color ?? "var(--accent)";
  // Alpha can't be appended to a CSS variable (`var(--accent)88` is invalid),
  // so when no explicit color is given we lean on the app's pre-baked glow
  // tokens. With an explicit hex color we append the alpha suffix as usual.
  const shadowColor = color ? `${color}88` : "var(--accent-glow)";
  const haloColor = color ? `${color}33` : "var(--accent-glow-soft)";

  // Periodic blink — eyes go dark for ~140ms every ~2.4-5s.
  const [blink, setBlink] = useState(false);
  useEffect(() => {
    if (!idle) return;
    if (
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return;
    }
    let alive = true;
    let timer: number;
    const schedule = () => {
      const next = 2400 + Math.random() * 2600;
      timer = window.setTimeout(() => {
        if (!alive) return;
        setBlink(true);
        window.setTimeout(() => {
          if (!alive) return;
          setBlink(false);
          schedule();
        }, 140);
      }, next);
    };
    schedule();
    return () => {
      alive = false;
      window.clearTimeout(timer);
    };
  }, [idle]);

  const cells = useMemo(() => {
    const out: Array<{ r: number; c: number; key: string }> = [];
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (MASCOT_PATTERN[r][c] !== "#") continue;
        out.push({ r, c, key: `${r}-${c}` });
      }
    }
    return out;
  }, []);

  const w = COLS * pixel;
  const h = ROWS * pixel;

  return (
    <div
      role="img"
      aria-label={ariaLabel || undefined}
      aria-hidden={ariaLabel ? undefined : true}
      className={className}
      style={{
        position: "relative",
        width: w,
        height: h,
        flex: "none",
        filter: glow
          ? `drop-shadow(0 0 ${pixel * 1.5}px ${shadowColor})`
          : "none",
      }}
    >
      {/* soft halo behind the head only */}
      {glow && (
        <div
          aria-hidden
          style={{
            position: "absolute",
            left: pixel * 5,
            top: pixel * 4,
            width: pixel * 13,
            height: pixel * 13,
            background: `radial-gradient(circle, ${haloColor}, transparent 65%)`,
            pointerEvents: "none",
          }}
        />
      )}
      {cells.map(({ r, c, key }) => {
        const isEye = EYE_CELLS.has(key);
        const isAntenna = ANTENNA_CELLS.has(key);
        const isChest = CHEST_CELLS.has(key);
        return (
          <div
            key={key}
            className={
              isAntenna
                ? "lds-mascot-antenna"
                : isChest && idle
                ? "lds-mascot-chest"
                : undefined
            }
            style={{
              position: "absolute",
              left: c * pixel,
              top: r * pixel,
              width: pixel,
              height: pixel,
              background: isEye && blink ? "transparent" : fill,
              transition: isEye ? "background 60ms steps(2)" : undefined,
            }}
          />
        );
      })}
    </div>
  );
}
