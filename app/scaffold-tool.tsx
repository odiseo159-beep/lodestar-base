"use client";

import AsciiProgress from "./ascii-progress";

type Props = {
  hasResults: boolean;
  resultCount: number;
  /**
   * Items the user has actively queued for the next scaffold run.
   * Defaults to the top 5 — but the user can toggle items in/out via
   * the + buttons on the result cards. The CTA labels and counters
   * always reflect this number, not the broader `resultCount`.
   */
  queueCount: number;
  scaffolding: boolean;
  error: string | null;
  onRun: () => void;
  topStacks?: string[];
};

/**
 * Right-rail widget shown when no scaffold has been generated yet.
 * Designed to feel like the active partner panel — heavier border, outer
 * glow that pulses when results are ready, file-preview block to make the
 * output tangible, and a full-width CTA as the focal point.
 */
export default function ScaffoldTool({
  hasResults,
  resultCount,
  queueCount,
  scaffolding,
  error,
  onRun,
  topStacks = [],
}: Props) {
  const ready = hasResults && !scaffolding && queueCount > 0;

  return (
    <div
      className={`border-2 border-accent ${
        ready ? "tool-ready" : "tool-idle"
      }`}
    >
      {/* ─── stage header ─── */}
      <div className="bg-screen-2 border-b border-rule px-4 py-2 text-[10px] uppercase tracking-widest flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span
            className={`${ready ? "text-grow ready-dot" : "text-ink-faint"}`}
          >
            ●
          </span>
          <span className="text-ink">tool</span>
          <span className="text-ink-faint">/</span>
          <span className="text-accent glow">scaffold</span>
        </div>
        <span className="text-ink-faint">
          stage <span className="text-accent">01</span>{" "}
          <span className="text-ink-faint">/</span> 02
        </span>
      </div>

      {/* ─── headline ─── */}
      <div className="px-5 py-5 border-b border-rule">
        <h3 className="text-base text-ink">
          <span className="text-accent glow">$</span> npm create{" "}
          <span className="text-ink-dim">&lt;new-project&gt;</span>
        </h3>
        <p className="mt-2 text-sm text-ink-dim leading-relaxed">
          hand the{" "}
          <span className="text-accent glow">
            {hasResults ? queueCount : "·"}
          </span>{" "}
          queued discover{queueCount === 1 ? "y" : "ies"} to the agent and
          get a runnable starter repo back —{" "}
          <span className="text-ink">deps</span>,{" "}
          <span className="text-ink">readme</span>,{" "}
          <span className="text-ink">source files</span>,{" "}
          <span className="text-ink">env</span>.
        </p>
      </div>

      {/* ─── file preview ─── */}
      <div className="px-5 py-4 border-b border-rule bg-screen-2/40">
        <div className="text-[10px] uppercase tracking-widest text-ink-faint mb-3 flex items-center justify-between">
          <span>will generate</span>
          <span className="text-ink-faint">~5-8 files</span>
        </div>
        <div className="font-mono text-[11px] space-y-1">
          <PreviewLine path="package.json" hint="real deps + scripts" />
          <PreviewLine path="README.md" hint="setup + usage example" />
          <PreviewLine path=".env.example" hint="required api keys" />
          <PreviewLine path=".gitignore" hint="standard ignores" />
          <PreviewLine path="src/index.ts" hint="entry point" />
          <PreviewLine path="src/*.ts" hint="agent logic, tools, types" />
          <PreviewLine
            path="// inspired-by"
            hint="citations + source links"
            faded
          />
        </div>

        {topStacks.length > 0 && (
          <div className="mt-3 pt-3 border-t border-rule/50">
            <div className="text-[10px] uppercase tracking-widest text-ink-faint mb-1.5">
              likely stack
            </div>
            <div className="flex flex-wrap gap-x-2 gap-y-0.5 text-[11px]">
              {topStacks.slice(0, 5).map((s) => (
                <span key={s} className="text-accent">
                  · {s}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ─── CTA ─── */}
      <div className="px-5 py-5">
        {scaffolding ? (
          <div className="py-2 text-center">
            <AsciiProgress label="generating starter repo …" />
          </div>
        ) : (
          <button
            onClick={onRun}
            disabled={!hasResults || queueCount === 0}
            className="w-full px-5 py-3.5 border-2 border-accent bg-accent/5 text-accent hover:bg-accent hover:text-screen disabled:border-rule disabled:bg-transparent disabled:text-ink-faint disabled:hover:bg-transparent disabled:hover:text-ink-faint text-sm tracking-wide transition-colors glow"
          >
            $ scaffold --from-queue{" "}
            {hasResults ? queueCount : 5} ↵
          </button>
        )}

        {!hasResults && !scaffolding && (
          <p className="mt-3 text-[11px] text-ink-faint text-center">
            <span className="text-accent">↳</span> run a search to enable
          </p>
        )}
        {ready && (
          <p className="mt-3 text-[11px] text-center text-grow flex items-center justify-center gap-2">
            <span className="ready-dot">●</span>
            <span>
              ready · {queueCount} queued / {resultCount} items · est.
              25-40s
            </span>
          </p>
        )}
        {hasResults && queueCount === 0 && !scaffolding && (
          <p className="mt-3 text-[11px] text-center text-warn">
            queue empty · click <span className="text-accent">+</span> on a
            result to add
          </p>
        )}

        {error && (
          <div className="mt-3 p-2 border border-err text-err text-[11px] glow-err">
            <span className="text-ink-faint">ERR:</span> {error}
          </div>
        )}
      </div>

      {/* ─── next steps ─── */}
      <div className="px-5 py-4 border-t border-rule bg-screen-2/40">
        <div className="text-[10px] uppercase tracking-widest text-ink-faint mb-2.5">
          next steps
        </div>
        <ol className="space-y-1.5 text-[11px]">
          <NextStep
            num="01"
            label="review the top 5 — scan match, novelty, on-base flag"
            done={hasResults}
          />
          <NextStep
            num="02"
            label="tune the queue — + to add, ✓ to remove"
            done={hasResults}
          />
          <NextStep
            num="03"
            label="run scaffold above — agent stitches deps + source"
            done={false}
          />
          <NextStep
            num="04"
            label="download the .zip and npm install"
            done={false}
          />
        </ol>
        <p className="mt-3 pt-2.5 border-t border-rule/50 text-[10px] text-ink-faint leading-relaxed">
          <span className="text-accent">tip</span> · default queue is the
          top 5. drop a rank you don't like with{" "}
          <span className="text-accent">✓</span>, pull in a lower-ranked
          item with <span className="text-accent">+</span>.
        </p>
      </div>
    </div>
  );
}

function NextStep({
  num,
  label,
  done,
}: {
  num: string;
  label: string;
  done: boolean;
}) {
  return (
    <li className="flex items-start gap-2">
      <span
        className={`tabular-nums w-6 shrink-0 ${
          done ? "text-accent" : "text-ink-faint"
        }`}
      >
        {num}
      </span>
      <span className={done ? "text-ink-dim" : "text-ink-faint"}>
        {label}
      </span>
    </li>
  );
}

function PreviewLine({
  path,
  hint,
  faded = false,
}: {
  path: string;
  hint: string;
  faded?: boolean;
}) {
  return (
    <div
      className={`flex items-center gap-2 ${
        faded ? "text-ink-faint" : "text-ink-dim"
      }`}
    >
      <span className={faded ? "text-ink-faint" : "text-accent"}>▸</span>
      <span className={`flex-1 truncate ${faded ? "" : "text-ink"}`}>
        {path}
      </span>
      <span className="text-ink-faint text-[10px] truncate">{hint}</span>
    </div>
  );
}
