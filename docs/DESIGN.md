# Design system reference

This is the source of truth for every visual decision in Lodestar. Each rule has a *why* — change the value, not the principle.

---

## Aesthetic stance

**Terminal monochrome with a single accent.** Pure black backgrounds, off-white text, Base blue for everything interactive or live. Sharp 1px borders globally. Geist Mono everywhere — no sans-serif anywhere in the app, including form labels and body text. CRT atmospherics (scanlines, vignette, rare flicker) keep it feeling like a system, not a webpage.

This is on purpose distinct from generic AI tool UIs (Cursor, v0, bolt). Those products optimize for friendly familiarity — Lodestar optimizes for **"this is a command center"**.

---

## Palette

Defined as CSS custom properties in `app/globals.css` under `:root`, exposed to Tailwind v4 via `@theme inline`:

| Token | Value | Used for |
|---|---|---|
| `--screen` | `#000000` | Pure black background |
| `--screen-2` | `#0a0a0a` | Slightly raised panels (status bar, headers inside cards) |
| `--screen-3` | `#111111` | One step further raised (unused currently, reserved) |
| `--ink` | `#f0f0f0` | Primary text |
| `--ink-dim` | `#707070` | Secondary text |
| `--ink-faint` | `#3a3a3a` | Tertiary text / hints / borders of input fills |
| `--rule` | `#2a2a2a` | Default 1px borders |
| `--rule-hot` | `#4a4a4a` | Hover state for `--rule` borders |
| `--rule-blue` | `#1e3666` | Reserved for soft-accent borders |
| `--accent` | `#4d8ef4` | THE accent. Base brand blue lifted +2 steps for readability on near-black |
| `--accent-dim` | `#1e3666` | Disabled / pressed accent states |
| `--accent-glow` | `rgba(77, 142, 244, 0.35)` | Phosphor glow base |
| `--accent-glow-soft` | `rgba(77, 142, 244, 0.15)` | Phosphor glow soft outer layer |
| `--grow` | `#86efac` | Success / "ready" indicators |
| `--warn` | `#f0b85f` | Warnings (early-stage maturity, base events in stream) |
| `--err` | `#e87070` | Errors only |
| `--err-glow` | `rgba(232, 112, 112, 0.4)` | Error phosphor glow |

**Rule**: only the accent gets glow. Other semantic colors (warn, err, grow) appear as plain text unless the context is an error/ready state with `.glow-err` or `.ready-dot`.

---

## Typography

Single typeface: **Geist Mono** (Google Fonts), weights 400/500/600. Loaded via `next/font/google` in `app/layout.tsx` and set as both `--font-sans` and `--font-mono` Tailwind tokens — so anywhere that uses `font-sans` also gets the mono.

**Why mono only**: terminal coherence. Mixing sans + mono fragments the aesthetic. Mono limits readability for paragraph text, but the entire product is designed around scannable rows, not prose.

### Sizes used

| Use | Class | Rendered |
|---|---|---|
| Logo (ASCII art) | `text-[7px] sm:text-[8px] md:text-[9px]` | 7-9px (small on purpose, banner is wide) |
| Page H1 (working mode logo) | `text-xl` | 20px |
| Page H1 (compact section title, e.g., scaffold name) | `text-base` | 16px |
| Body | `text-sm` | 14px |
| Body dim (metadata, secondary text) | `text-xs` | 12px |
| Metadata, badges, labels | `text-[11px]` | 11px |
| Uppercase labels, tags, badges | `text-[10px]` | 10px |
| Tabular numeric values | `tabular-nums` | aligns digits |

**Uppercase + tracking-widest** is used for all category labels: `▸ TOOL / SCAFFOLD`, `▸ FILTERS`, `WILL GENERATE`, etc. Lowercase for content.

---

## Borders + shape

- **Zero rounding globally**. CSS `* { border-radius: 0 !important }` is applied to most container elements in `globals.css`. The terminal aesthetic doesn't have rounded corners.
- **1px** is the default border weight. **2px** is reserved for the active tool panel (`ScaffoldTool` when ready) to signal heavier visual weight.
- **Dashed borders** for empty states: `border border-dashed border-rule`. The dash communicates "nothing here yet".

---

## Atmospherics (always-on, low-key)

### Scanlines
A `body::before` fixed pseudo-element with `repeating-linear-gradient` every 2-3px at 2% opacity, `mix-blend-mode: overlay`. Bumped from 1.2% to 2% for slightly stronger CRT feel.

### Vignette
A `body::after` fixed pseudo-element with `radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.35) 100%)`. Darkens the corners gently.

### Flicker
Body element has `animation: term-flicker 22s infinite linear`. Keyframes hold opacity at 1 for 92% of the cycle, then briefly drop to 0.97 → 1.02 → 0.99 → 1 over 3 frames. The user perceives a rare, very brief brightness pulse — feels alive, doesn't distract.

### Phosphor glow
`.glow` applies `text-shadow: 0 0 4px var(--accent-glow), 0 0 10px var(--accent-glow-soft)`. Used on accent text (badges, the `>` cursor, the `discover>` prompt label, key labels).

### Cursor blink
`.term-cursor` is a 0.6em × 1em accent-colored block with `box-shadow: 0 0 6px var(--accent-glow)`. Animates `opacity: 1 → 0` every 1s via `steps(2, end)` — sharp on/off, never fades.

---

## Logo glitch (signature effect)

Located in `app/ascii-logo.tsx` + `globals.css`. The ASCII LODESTAR banner has three layers:

1. **Base layer**: solid `text-accent glow` — always readable.
2. **Red layer** (`logo-layer-r`): semitransparent red copy, `position: absolute; inset: 0`, animation `logo-tear-r 6.2s infinite linear`.
3. **Blue layer** (`logo-layer-b`): semitransparent blue copy, animation `logo-tear-b 5.7s infinite linear`.

Each animation has 3 glitch windows per cycle: ~15% (mini), ~48% (mini), ~89-92% (main burst). Outside those windows `opacity: 0` so the layers are invisible 96% of the time.

During glitches:
- `transform: translate(-2px to 2px, 0 to 1px)` — small horizontal jitter
- `clip-path: inset(N% 0 M% 0)` — masks a horizontal band of the logo
- Opacity rises briefly to 0.55 (red) / 0.7 (blue)

**Why different cycle durations**: 6.2 vs 5.7 means the two layers drift in and out of sync. Glitches feel random, not metronomic. Total period before exact re-sync ≈ 70s.

Subtle parameters: max 2px shift, max 0.7 opacity on peak layer, glitch window ≤4% of cycle. Goal: noticeable on a second look, never distracting on first.

---

## Glitch as event signal

Distinct from the always-on logo glitch. Three event-driven glitch classes:

| Class | When | What |
|---|---|---|
| `.glitch-flash` | Search button clicked | 120ms shake + RGB split on the header element |
| `.glitch-error` | Error appears | 180ms shake on the error block |
| `.anim-reveal` | Result item mounts | 180ms fade + 3px slide-in left → right. Staggered 25ms per row |

These communicate state changes. The user learns: "ah, it heard me" / "ah, something failed" / "ah, results arrived sequentially".

---

## Layout primitives

### Full-width, no centered cap (except 4K)
```tsx
<main className="px-4 lg:px-6 py-6">
  <div className="2xl:max-w-[1800px] 2xl:mx-auto">
    ...
  </div>
</main>
```

Edge padding 16px (mobile) → 24px (large). Container is full-width up to 4K where it caps at 1800px to avoid absurdly long lines.

### Two-pane split (research | tools)
Working mode uses:
```tsx
<div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(480px,620px)] lg:gap-6 items-start">
  <div className="min-w-0">{/* results */}</div>
  <aside className="lg:sticky lg:top-3 min-w-0">{/* tools */}</aside>
</div>
```

The right column is **sticky** at `top-3` so it stays visible as the user scrolls the results. The right column's content (`ScaffoldTool` or `ScaffoldPanel`) has its own internal scroll if needed.

Below `lg` (1024px), the grid collapses to a single column — tools appear below results.

---

## Component patterns

### Status bar
Always at the very top, full-width, 1.5px vertical padding, `text-[11px]` content:
```
● lodestar v0.1 · network: base mainnet                  session: ...
```

Used as a navigational anchor — visible on every page (search, audit, profile).

### Stage indicator
Tools that participate in a workflow show their stage in the top-right of their header:
```
● tool / scaffold                                    stage 01 / 02
```

The active stage is in `text-accent`. Future stages stay in `text-ink-faint`.

### Source / category badges
Bracketed monospace, no pills:
```
[GH] [HN] [RD]   ← source
[TOY] [EARLY] [PROD]   ← maturity
[ON BASE]   ← onchain (with border + glow)
[FC ⚡]   ← Farcaster power badge
```

This replaces colored pills (the "before" SaaS look) with a more authentically-terminal idiom.

### Tag/facet chip
Active vs inactive states:
```
inactive:  border border-rule text-ink-dim hover:text-ink hover:border-rule-hot
active:    border border-accent bg-accent/15 text-accent
```

Counter prefix: `<span class="text-ink-faint mr-1">{count}</span>{value}` — renders as `13 github` with the count dimmer than the value.

### ASCII progress bar
Bouncing block with trailing fade:
```
[░░░▒▓█▓▒░░░░░░░]  scanning sources...
```

Single block at peak (`█`), softening to `▓` then `▒` as it trails. Slides 90ms per step across 14 slots. Used instead of spinners.

---

## Boot sequence

`app/boot-sequence.tsx` wraps the entire app in `layout.tsx`. On first visit per session (`sessionStorage.lodestar.booted` flag), shows 5 lines that type out at offsets 0, 220, 480, 720, 940, 1180ms. Total cycle ~1.7s.

Lines progress from `text-accent` (booting) → `text-ink-dim` (scanning) → `text-grow` (OK) → `text-accent` (ready_). A blinking cursor follows the last line until completion. Click anywhere / Esc / Enter / Space skips.

After ~1.7s the overlay fades over 200ms and the actual page appears.

---

## SystemStream design

Live mock activity panel. Maintains a buffer of 24 events, displays the last 12 in `flex-col-reverse` (newest at bottom, oldest at top), with `opacity` decreasing 0.07 per row higher (so the top row is ~0.15 opacity).

New events arrive every **600-2000ms** (random jitter). Each event has a type that maps to a color:
- `info` → `text-ink-dim`
- `ok` → `text-grow`
- `agent` → `text-accent`
- `base` → `text-warn`

Templates in `system-stream.tsx`: 12 event shapes that interpolate random tokens (repo names, usernames, queries, hex addresses, block numbers).

A top fade-out gradient (linear gradient from `var(--screen)` to transparent) softens the disappearance of old events at the top of the panel.

---

## OnchainPulse design

Static-feeling but micro-animated panel:

- **Block height**: increments +1 to +3 every 2.2s. `tabular-nums` so digits don't jiggle.
- **Gas**: random walk ±0.8 every 2.2s, clamped [5, 80].
- **Contracts/min**: random walk ±3, clamped [18, 92].
- **Waveform**: 32 Unicode bar characters (`▁▂▃▄▅▆▇█`). Calculated from `sin(t*2) + sin(t*3.7)*0.45 + sin(t*5.3)*0.2` with `phase` incrementing every 110ms. Output looks like a flowing audio waveform.
- **Top builders**: hard-coded list of 5 for v0 with mock score + delta values.

---

## Accessibility rules

`@media (prefers-reduced-motion: reduce)`:
- `body` animation → none (no flicker)
- `.term-cursor` → no blink, opacity 1
- `.anim-reveal`, `.glitch-flash`, `.glitch-error`, `.logo-layer-r`, `.logo-layer-b`, `.logo-text-tear` → no animation
- `.logo-layer-r`, `.logo-layer-b` → opacity 0 (so the static RGB layers don't sit there as a fake glitch frozen in place)

Result: the entire app is fully usable without motion, with the same information density.

---

## Adding new visual elements: checklist

Before adding any visual:

1. Does it use only `screen / ink / accent` for colors? If you reach for a new color, ask if `accent-dim` or `ink-faint` would work instead.
2. Is it monospace? If not, why?
3. Are corners sharp (no `rounded-*`)?
4. If it has an animation, does it respect `prefers-reduced-motion`? Add it to the reduced-motion media query in `globals.css`.
5. If it has glow, is it accent-based? No other color gets glow.
6. If it's a label or category name, is it `uppercase tracking-widest`?
7. If it's a state indicator, does it use the right semantic color (grow for ready, warn for early-stage, err for failures)?
8. For interactive elements: do hover and active states use `border-rule-hot` (for default) or `bg-accent hover` (for accent buttons)?

If something feels off but you can't pinpoint why, it's usually a violation of one of those rules.
