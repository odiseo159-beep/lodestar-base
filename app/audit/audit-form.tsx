"use client";

import { useState } from "react";

type AuditImprovement = {
  category:
    | "quick-win"
    | "pattern-gap"
    | "stack"
    | "docs"
    | "infra"
    | "novelty"
    | "security";
  title: string;
  detail: string;
  priority: "high" | "medium" | "low";
  effort: "small" | "medium" | "large";
  inspiredBy?: string;
};

type AuditPeer = {
  title: string;
  url: string;
  whyRelevant: string;
};

type AuditResult = {
  repo: {
    owner: string;
    repo: string;
    url: string;
    stars: number;
    description: string | null;
  };
  inferredQuery: string;
  summary: string;
  strengths: string[];
  peers: AuditPeer[];
  improvements: AuditImprovement[];
};

const CATEGORY_COLOR: Record<AuditImprovement["category"], string> = {
  "quick-win": "text-grow",
  "pattern-gap": "text-warn",
  stack: "text-accent",
  docs: "text-accent",
  infra: "text-ink-dim",
  novelty: "text-accent",
  security: "text-err",
};

const PRIORITY_COLOR: Record<AuditImprovement["priority"], string> = {
  high: "text-err",
  medium: "text-warn",
  low: "text-ink-dim",
};

export default function AuditForm() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [audit, setAudit] = useState<AuditResult | null>(null);

  async function runAudit(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim()) return;
    setLoading(true);
    setError(null);
    setAudit(null);
    try {
      const res = await fetch("/api/audit", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ repoUrl: url.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(
          typeof data.error === "string" ? data.error : "Audit failed"
        );
      }
      setAudit(data.audit);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  function copyMarkdown() {
    if (!audit) return;
    navigator.clipboard.writeText(toMarkdown(audit));
  }

  return (
    <div>
      <form onSubmit={runAudit} className="mb-8">
        <div className="flex items-stretch border border-rule focus-within:border-accent transition-colors">
          <span className="px-3 py-3 text-accent border-r border-rule flex items-center select-none">
            audit&gt;
          </span>
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://github.com/owner/repo · owner/repo"
            className="flex-1 px-4 py-3 bg-screen text-ink placeholder:text-ink-faint focus:outline-none"
          />
          <button
            type="submit"
            disabled={loading || !url.trim()}
            className="px-5 py-3 border-l border-rule text-accent hover:bg-accent hover:text-screen disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-accent transition-colors"
          >
            {loading ? "auditing…" : "run ↵"}
          </button>
        </div>
      </form>

      {error && (
        <div className="mb-4 p-3 border border-err text-err text-xs">
          <span className="text-ink-faint">ERR:</span> {error}
        </div>
      )}

      {loading && (
        <div className="py-12 text-center text-xs text-ink-dim">
          <span className="text-accent">●</span> fetching repo … finding peers …
          comparing patterns … <span className="text-ink-faint">~45s</span>
        </div>
      )}

      {audit && <AuditResultView audit={audit} onCopy={copyMarkdown} />}
    </div>
  );
}

function AuditResultView({
  audit,
  onCopy,
}: {
  audit: AuditResult;
  onCopy: () => void;
}) {
  const sortedImprovements = [...audit.improvements].sort((a, b) => {
    const pri = { high: 0, medium: 1, low: 2 } as const;
    return pri[a.priority] - pri[b.priority];
  });

  return (
    <div>
      {/* ────── repo header ────── */}
      <div className="border border-accent">
        <div className="bg-screen-2 border-b border-rule px-3 py-1.5 flex items-center justify-between text-[10px] uppercase tracking-widest text-ink-faint">
          <div className="flex items-center gap-2">
            <span className="text-accent">●</span>
            <span>audit</span>
            <span>/</span>
            <span className="text-ink">
              {audit.repo.owner}/{audit.repo.repo}
            </span>
          </div>
          <button
            onClick={onCopy}
            className="text-ink-dim hover:text-ink uppercase tracking-wide"
          >
            [copy md]
          </button>
        </div>
        <div className="p-4">
          <a
            href={audit.repo.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-ink text-base no-underline hover:text-accent"
          >
            <span className="text-accent">$</span> {audit.repo.owner}/
            {audit.repo.repo}
          </a>
          {audit.repo.description && (
            <p className="mt-1 text-xs text-ink-dim">{audit.repo.description}</p>
          )}
          <div className="mt-2 text-[11px] text-ink-faint tabular-nums">
            ★ {audit.repo.stars.toLocaleString()} · query={" "}
            <span className="text-ink-dim">{audit.inferredQuery}</span>
          </div>
          <p className="mt-3 text-sm text-ink">{audit.summary}</p>
        </div>
      </div>

      {/* ────── strengths ────── */}
      {audit.strengths.length > 0 && (
        <div className="mt-6 border border-rule">
          <div className="bg-screen-2 border-b border-rule px-3 py-1.5 text-[10px] uppercase tracking-widest text-grow">
            ▸ strengths
          </div>
          <ul className="p-4 space-y-1">
            {audit.strengths.map((s, i) => (
              <li
                key={i}
                className="text-sm text-ink flex gap-2 leading-relaxed"
              >
                <span className="text-grow flex-shrink-0">+</span>
                <span>{s}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* ────── improvements ────── */}
      <div className="mt-6 border border-rule">
        <div className="bg-screen-2 border-b border-rule px-3 py-1.5 text-[10px] uppercase tracking-widest text-ink-dim flex items-center justify-between">
          <span>▸ improvements</span>
          <span className="text-ink-faint">
            {audit.improvements.length} findings
          </span>
        </div>
        <ul>
          {sortedImprovements.map((imp, i) => (
            <li
              key={i}
              className="border-b border-rule last:border-b-0 px-4 py-3"
            >
              <div className="flex items-center gap-2 flex-wrap text-[10px] uppercase tracking-wide">
                <span className={`tabular-nums text-ink-faint`}>
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className={CATEGORY_COLOR[imp.category]}>
                  [{imp.category}]
                </span>
                <span className={`${PRIORITY_COLOR[imp.priority]} font-medium`}>
                  {imp.priority}
                </span>
                <span className="text-ink-faint">
                  · {imp.effort} effort
                </span>
              </div>
              <h3 className="mt-1 text-sm text-ink">{imp.title}</h3>
              <p className="mt-1 text-xs text-ink-dim leading-relaxed">
                {imp.detail}
              </p>
              {imp.inspiredBy && (
                <p className="mt-1.5 text-[10px] text-ink-faint">
                  <span className="text-accent">▸</span> pattern seen in:{" "}
                  <span className="text-ink-dim">{imp.inspiredBy}</span>
                </p>
              )}
            </li>
          ))}
        </ul>
      </div>

      {/* ────── peers ────── */}
      {audit.peers.length > 0 && (
        <div className="mt-6 border border-rule bg-screen-2">
          <div className="border-b border-rule px-3 py-1.5 text-[10px] uppercase tracking-widest text-ink-faint">
            ▸ peers compared
          </div>
          <ul className="p-4 space-y-1">
            {audit.peers.map((p, i) => (
              <li key={i} className="text-[11px] text-ink-dim">
                <span className="text-ink-faint">·</span>{" "}
                <a
                  href={p.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-accent no-underline hover:underline"
                >
                  {p.title}
                </a>
                <span className="text-ink-faint"> — {p.whyRelevant}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function toMarkdown(a: AuditResult): string {
  const lines: string[] = [];
  lines.push(`# Audit: ${a.repo.owner}/${a.repo.repo}`);
  lines.push("");
  lines.push(a.summary);
  lines.push("");
  lines.push(`Inferred query: \`${a.inferredQuery}\``);
  lines.push("");
  if (a.strengths.length > 0) {
    lines.push("## Strengths");
    for (const s of a.strengths) lines.push(`- ${s}`);
    lines.push("");
  }
  lines.push("## Improvements");
  for (const imp of a.improvements) {
    lines.push(
      `### [${imp.category}] ${imp.title}  _(priority: ${imp.priority}, effort: ${imp.effort})_`
    );
    lines.push(imp.detail);
    if (imp.inspiredBy) lines.push(`_Inspired by: ${imp.inspiredBy}_`);
    lines.push("");
  }
  if (a.peers.length > 0) {
    lines.push("## Peers compared");
    for (const p of a.peers) {
      lines.push(`- [${p.title}](${p.url}) — ${p.whyRelevant}`);
    }
  }
  return lines.join("\n");
}
