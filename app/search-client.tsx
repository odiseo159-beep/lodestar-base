"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import type { Session } from "next-auth";
import { signInWithGitHub, signOutAction } from "./auth-actions";
import WalletConnect from "./wallet-connect";
import ScaffoldPanel, { type Scaffold } from "./scaffold-panel";
import ScaffoldTool from "./scaffold-tool";
import AsciiLogo from "./ascii-logo";
import AsciiProgress from "./ascii-progress";
import HeroSection from "./hero-section";
import ResultsFacets from "./results-facets";
import AgentReport from "./agent-report";
import ThemeToggle from "./theme-toggle";
import { applyFilters, type FacetKey } from "@/lib/tags";

type ExtractedMetadata = {
  stack: string[];
  purpose: string;
  novelty: number;
  maturity: "toy" | "early" | "production";
  audience: string[];
  relevance: number;
};

type CreatorOnchain = {
  farcasterUsername: string | null;
  farcasterFid: number | null;
  farcasterPfpUrl: string | null;
  farcasterFollowers: number;
  farcasterPowerBadge: boolean;
  baseContractCount: number;
  baseTxCount: number;
  baseFirstTxAt: string | null;
  hasBasePresence: boolean;
};

type UnifiedItem = {
  id: string;
  source: "github" | "hn" | "reddit";
  externalId: string;
  title: string;
  url: string;
  description: string | null;
  author: {
    handle: string;
    avatarUrl: string | null;
    profileUrl: string | null;
  };
  signals: {
    stars?: number;
    forks?: number;
    points?: number;
    comments?: number;
  };
  language?: string | null;
  topics?: string[];
  createdAt: string | null;
  extracted?: ExtractedMetadata;
  creator?: CreatorOnchain;
};

type RecentSearch = {
  query: string;
  createdAt: string;
};

const SOURCE_LABEL: Record<UnifiedItem["source"], string> = {
  github: "GH",
  hn: "HN",
  reddit: "RD",
};

const MATURITY_LABEL: Record<ExtractedMetadata["maturity"], string> = {
  toy: "TOY",
  early: "EARLY",
  production: "PROD",
};

const MATURITY_COLOR: Record<ExtractedMetadata["maturity"], string> = {
  toy: "text-ink-dim",
  early: "text-warn",
  production: "text-grow",
};

export default function SearchClient({
  session,
  recentSearches,
}: {
  session: Session | null;
  recentSearches: RecentSearch[];
}) {
  const [query, setQuery] = useState("AI agents");
  const [items, setItems] = useState<UnifiedItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [meta, setMeta] = useState<
    { sources: string[]; enriched: boolean; responseMs?: number } | null
  >(null);
  const [scaffold, setScaffold] = useState<Scaffold | null>(null);
  const [scaffolding, setScaffolding] = useState(false);
  const [scaffoldError, setScaffoldError] = useState<string | null>(null);
  const [glitch, setGlitch] = useState(false);
  const [activeFilters, setActiveFilters] = useState<Set<FacetKey>>(new Set());
  // Scaffold queue — items the user has explicitly picked for the next
  // scaffold run. Defaults to the top 5 whenever a fresh search lands
  // (so users who never touch + still get the same behavior as before),
  // but they can override by toggling individual cards.
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [, startTransition] = useTransition();

  const filteredItems = activeFilters.size === 0
    ? items
    : applyFilters(items, activeFilters);

  // Reset selection to top 5 whenever the items array changes from a
  // new search. We key on the join of the first 5 ids so re-filtering
  // (which doesn't change `items`) preserves user choices.
  useEffect(() => {
    setSelectedIds(new Set(items.slice(0, 5).map((it) => it.id)));
  }, [items]);

  const selectedItems = items.filter((it) => selectedIds.has(it.id));

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleFilter(key: FacetKey) {
    setActiveFilters((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function clearFilters() {
    setActiveFilters(new Set());
  }

  function pickAndSearch(q: string) {
    setQuery(q);
    setActiveFilters(new Set()); // reset filters on new search
    runSearch(q);
  }

  function flashGlitch() {
    setGlitch(true);
    window.setTimeout(() => setGlitch(false), 150);
  }

  async function buildScaffold() {
    if (items.length === 0) return;
    // Use the user's selection queue when non-empty, falling back to the
    // top 5 if they manually emptied it (defensive — the auto-default
    // means this fallback rarely fires).
    const queue =
      selectedItems.length > 0 ? selectedItems : items.slice(0, 5);
    setScaffolding(true);
    setScaffoldError(null);
    setScaffold(null);
    try {
      const res = await fetch("/api/scaffold", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          query,
          items: queue,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(
          typeof data.error === "string" ? data.error : "Scaffold failed"
        );
      }
      setScaffold(data.scaffold);
      setTimeout(() => {
        document
          .getElementById("scaffold-panel")
          ?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100);
    } catch (err) {
      setScaffoldError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setScaffolding(false);
    }
  }

  async function runSearch(q: string) {
    if (q.trim().length < 2) return;
    flashGlitch();
    setQuery(q);
    setActiveFilters(new Set());
    setLoading(true);
    setError(null);
    setItems([]);
    setMeta(null);
    try {
      const res = await fetch(
        `/api/search?q=${encodeURIComponent(q)}&perSource=8`
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Search failed");
      setItems(data.items);
      setMeta({
        sources: data.sources,
        enriched: data.enriched,
        responseMs: typeof data.responseMs === "number" ? data.responseMs : undefined,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  const userLabel = session?.user
    ? session.user.name && session.user.name.startsWith("0x")
      ? session.user.name
      : session.user.name ?? session.user.email ?? "user"
    : null;

  // Hero mode: no results yet, not loading, no error → show the
  // "agent observatory" landing. Working mode: anything else.
  const inHero = !loading && items.length === 0 && !error;

  return (
    <>
      {/* ────── status bar ────── */}
      <div className="border-b border-rule bg-screen text-[11px] text-ink-dim">
        <div className="px-4 lg:px-6 py-1.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-accent">●</span>
            <span>lodestar v0.1</span>
            <span className="hidden sm:inline">·</span>
            <span className="hidden sm:inline">network: base mainnet</span>
          </div>
          <div className="flex items-center gap-3">
            {session?.user ? (
              <>
                <span className="hidden sm:inline">session:</span>
                <span className="text-ink truncate max-w-[180px]">
                  {userLabel}
                </span>
              </>
            ) : (
              <span>session: anonymous</span>
            )}
            <span className="text-ink-faint">·</span>
            <ThemeToggle />
          </div>
        </div>
      </div>

      <main className="min-h-screen bg-screen px-4 lg:px-6 py-6">
        <div className="2xl:max-w-[1800px] 2xl:mx-auto">
          {/* ────── header (nav-only in hero mode, logo+nav in working mode) ────── */}
          <header
            className={`flex items-start justify-between gap-4 flex-wrap ${
              inHero ? "mb-0" : "mb-8"
            }`}
          >
            {inHero ? (
              <div /> /* spacer so nav stays right-aligned */
            ) : (
              <div className={glitch ? "glitch-flash" : ""}>
                <div className="flex items-baseline gap-2">
                  <span className="text-accent glow text-sm">~/</span>
                  <h1 className="text-xl text-ink font-medium tracking-tight">
                    lodestar
                  </h1>
                  <span className="term-cursor" />
                </div>
                <p className="text-ink-dim text-xs mt-1">
                  <span className="text-accent">{"//"}</span> agent-curated
                  discovery for builders on Base
                </p>
              </div>
            )}

            <nav className="flex items-center gap-1 text-xs">
              {session?.user ? (
                <>
                  <Link
                    href="/audit"
                    className="px-3 py-1.5 border border-rule text-ink-dim hover:text-ink hover:border-rule-hot no-underline"
                  >
                    audit
                  </Link>
                  <Link
                    href="/profile"
                    className="px-3 py-1.5 border border-rule text-ink-dim hover:text-ink hover:border-rule-hot no-underline"
                  >
                    profile
                  </Link>
                  {session.user.image && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={session.user.image}
                      alt={session.user.name ?? "user"}
                      className="w-7 h-7 border border-rule ml-1"
                    />
                  )}
                  <form action={signOutAction}>
                    <button
                      type="submit"
                      className="px-3 py-1.5 border border-rule text-ink-dim hover:text-ink hover:border-rule-hot"
                    >
                      exit
                    </button>
                  </form>
                </>
              ) : (
                <div className="flex items-center gap-1">
                  <form action={signInWithGitHub}>
                    <button
                      type="submit"
                      className="px-3 py-1.5 border border-accent text-accent hover:bg-accent hover:text-screen transition-colors"
                    >
                      $ login --github
                    </button>
                  </form>
                  <WalletConnect />
                </div>
              )}
            </nav>
          </header>

          {/* ────── HERO MODE: agent observatory ────── */}
          {inHero && (
            <HeroSection
              query={query}
              onQueryChange={setQuery}
              onSubmit={() => runSearch(query)}
              onPick={pickAndSearch}
              signedIn={!!session?.user}
            />
          )}

          {/* ────── WORKING MODE: compact search + results + tools ────── */}
          {!inHero && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                runSearch(query);
              }}
              className="mb-6"
            >
              <div className="flex items-stretch border border-rule focus-within:border-accent transition-colors">
                <span className="px-3 py-3 text-accent glow border-r border-rule flex items-center select-none">
                  discover&gt;
                </span>
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="ai agents · x402 · base agent · farcaster frame ..."
                  className="flex-1 px-4 py-3 bg-screen text-ink placeholder:text-ink-faint focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={loading || query.trim().length < 2}
                  className="px-5 py-3 border-l border-rule text-accent hover:bg-accent hover:text-screen disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-accent transition-colors"
                >
                  {loading ? "scanning…" : "run ↵"}
                </button>
              </div>
            </form>
          )}

          {!inHero && session?.user && recentSearches.length > 0 && (
            <div className="mb-6 flex flex-wrap items-center gap-2 text-xs">
              <span className="text-ink-faint uppercase tracking-wide">
                history:
              </span>
              {recentSearches.map((s, i) => (
                <button
                  key={i}
                  onClick={() => startTransition(() => runSearch(s.query))}
                  className="px-2 py-0.5 border border-rule text-ink-dim hover:text-ink hover:border-rule-hot"
                >
                  {s.query}
                </button>
              ))}
            </div>
          )}

          {!inHero && meta && (
            <div className="mb-3 text-[11px] text-ink-faint uppercase tracking-wide flex items-center gap-3">
              <span className="text-grow">●</span>
              <span>
                sources={meta.sources.join("+")} ·
                {meta.enriched ? " curated" : " raw"}
              </span>
            </div>
          )}

          {!inHero && items.length > 0 && (
            <AgentReport
              items={items}
              filteredCount={filteredItems.length}
              responseMs={meta?.responseMs}
            />
          )}

          {!inHero && items.length > 0 && (
            <ResultsFacets
              items={items}
              activeKeys={activeFilters}
              onToggle={toggleFilter}
              onClear={clearFilters}
              filteredCount={filteredItems.length}
            />
          )}

          {!inHero && error && (
            <div className="mb-4 p-3 border border-err text-err text-xs glitch-error glow-err">
              <span className="text-ink-faint">ERR:</span> {error}
            </div>
          )}

          {!inHero && loading && (
            <div className="mb-4 py-3 text-xs text-ink-dim flex items-center gap-2">
              <AsciiProgress label="reading sources · extracting metadata · ranking" />
            </div>
          )}

          {/* ──── working layout: research | tools split ──── */}
          {!inHero && (
          <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(480px,620px)] lg:gap-6 items-start">
            {/* left: research column */}
            <div className="min-w-0">
              {filteredItems.length === 0 && items.length > 0 && (
                <div className="py-8 text-center text-xs text-ink-faint border border-dashed border-rule">
                  <span className="text-accent glow">{"//"}</span> no items
                  match these filters · adjust above or{" "}
                  <button
                    onClick={clearFilters}
                    className="text-accent hover:underline"
                  >
                    clear all
                  </button>
                </div>
              )}

              {/* Top 5 — high-affordance cards with rank, score bar, actions */}
              {filteredItems.slice(0, 5).length > 0 && (
                <div className="mb-4">
                  <div className="text-[10px] uppercase tracking-widest text-ink-faint mb-2 flex items-center gap-2">
                    <span className="text-accent">▸</span>
                    <span>top 5 — high-signal</span>
                    <span className="text-ink-dim">·</span>
                    <span className="text-ink-dim normal-case tracking-normal">
                      click <span className="text-accent">+</span> to queue for
                      scaffold
                    </span>
                  </div>
                  <ul>
                    {filteredItems.slice(0, 5).map((item, idx) => (
                      <TopCard
                        key={item.id}
                        item={item}
                        index={idx + 1}
                        revealDelay={idx * 25}
                        selected={selectedIds.has(item.id)}
                        onToggleSelect={toggleSelect}
                      />
                    ))}
                  </ul>
                </div>
              )}

              {/* Rows 6+ — compact dense list */}
              {filteredItems.slice(5).length > 0 && (
                <div>
                  <div className="text-[10px] uppercase tracking-widest text-ink-faint mb-2 flex items-center gap-2">
                    <span className="text-accent">▸</span>
                    <span>
                      more · {filteredItems.length - 5} items
                    </span>
                  </div>
                  <ul>
                    {filteredItems.slice(5).map((item, idx) => (
                      <CompactRow
                        key={item.id}
                        item={item}
                        index={idx + 6}
                        revealDelay={(idx + 5) * 25}
                        selected={selectedIds.has(item.id)}
                        onToggleSelect={toggleSelect}
                      />
                    ))}
                  </ul>
                </div>
              )}

              {items.length > 0 && scaffold && (
                <div className="mt-6 flex items-center justify-between text-xs text-ink-faint">
                  <span>
                    <span className="text-accent">{"//"}</span> scaffold based
                    on {selectedItems.length} queued item
                    {selectedItems.length !== 1 ? "s" : ""} →
                  </span>
                  <button
                    onClick={buildScaffold}
                    disabled={scaffolding}
                    className="px-3 py-1 border border-rule text-ink-dim hover:text-ink hover:border-rule-hot"
                  >
                    {scaffolding ? "regenerating…" : "$ regenerate"}
                  </button>
                </div>
              )}
            </div>

            {/* right: tools rail — always visible */}
            <aside
              id="scaffold-panel"
              className="lg:sticky lg:top-3 min-w-0"
            >
              {scaffold ? (
                <ScaffoldPanel
                  scaffold={scaffold}
                  onClose={() => setScaffold(null)}
                />
              ) : (
                <ScaffoldTool
                  hasResults={items.length > 0}
                  resultCount={items.length}
                  queueCount={selectedItems.length}
                  scaffolding={scaffolding}
                  error={scaffoldError}
                  onRun={buildScaffold}
                  topStacks={Array.from(
                    new Set(
                      selectedItems.flatMap(
                        (it) => it.extracted?.stack ?? []
                      )
                    )
                  )}
                />
              )}
            </aside>
          </div>
          )}

          {/* ────── footer ────── */}
          <footer className="mt-16 pt-4 border-t border-rule text-[10px] text-ink-faint uppercase tracking-widest flex items-center justify-between">
            <span>lodestar // agent-curated discovery</span>
            <span>
              base · sonnet 4.5 · {new Date().toISOString().slice(0, 10)}
            </span>
          </footer>
        </div>
      </main>
    </>
  );
}

/**
 * TopCard — high-affordance card used for items 1-5. Big rank,
 * inline score bar, full meta line, and 3 actions in the gutter:
 *
 *    [+]      toggle into scaffold queue (✓ when active)
 *    [↗]      open the source URL in a new tab
 *    [☆]      save (placeholder — no-op until Phase 5 of a later iteration)
 *
 * Layout: rank | avatar | content | actions. Mobile collapses actions
 * under the content to keep the title line readable.
 */
function TopCard({
  item,
  index,
  revealDelay,
  selected,
  onToggleSelect,
}: {
  item: UnifiedItem;
  index: number;
  revealDelay: number;
  selected: boolean;
  onToggleSelect: (id: string) => void;
}) {
  const e = item.extracted;
  const c = item.creator;
  const relevance = e ? Math.round(e.relevance * 100) : 0;

  return (
    <li
      className={`border border-rule mb-2 anim-reveal transition-colors ${
        selected
          ? "bg-accent/[0.04] border-accent/40"
          : "hover:bg-screen-2 hover:border-rule-hot"
      }`}
      style={{ animationDelay: `${revealDelay}ms` }}
    >
      <div className="px-3 sm:px-4 py-3 flex items-start gap-3 sm:gap-4">
        {/* big rank */}
        <span
          className={`text-2xl tabular-nums select-none leading-none pt-1 shrink-0 ${
            index === 1
              ? "text-accent glow"
              : selected
              ? "text-accent"
              : "text-ink-faint"
          }`}
        >
          {String(index).padStart(2, "0")}
        </span>

        {/* avatar */}
        {item.author.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.author.avatarUrl}
            alt={item.author.handle}
            className="w-10 h-10 border border-rule flex-shrink-0 mt-0.5"
          />
        ) : (
          <div className="w-10 h-10 border border-rule flex items-center justify-center text-ink-dim text-xs flex-shrink-0 mt-0.5">
            {item.author.handle.slice(0, 2).toUpperCase()}
          </div>
        )}

        {/* main content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap text-xs">
            <span className="text-ink-faint">
              [{SOURCE_LABEL[item.source]}]
            </span>
            <a
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-ink no-underline hover:text-accent break-words text-sm sm:text-base"
            >
              {item.title}
            </a>
            {e?.maturity && (
              <span className={`${MATURITY_COLOR[e.maturity]} text-[10px]`}>
                [{MATURITY_LABEL[e.maturity]}]
              </span>
            )}
            {c?.hasBasePresence && (
              <span
                title={`${c.baseContractCount} verified contracts · ${c.baseTxCount} txs on Base`}
                className="text-accent text-[10px] border border-accent px-1 glow"
              >
                ON BASE
              </span>
            )}
            {c?.farcasterPowerBadge && (
              <span
                title="Farcaster power badge"
                className="text-warn text-[10px]"
              >
                [FC ⚡]
              </span>
            )}
          </div>

          {e?.purpose && (
            <p className="mt-1.5 text-sm text-ink-dim leading-relaxed">
              {e.purpose}
            </p>
          )}
          {!e?.purpose && item.description && (
            <p className="mt-1.5 text-sm text-ink-dim line-clamp-2">
              {item.description}
            </p>
          )}

          {/* score bar — only if extracted */}
          {e && (
            <div className="mt-2 flex items-center gap-2 text-[10px] tabular-nums">
              <span className="text-ink-faint uppercase tracking-wide w-12">
                match
              </span>
              <div className="flex-1 max-w-[260px] h-1.5 bg-screen-2 border border-rule overflow-hidden">
                <div
                  className="h-full bg-accent glow"
                  style={{ width: `${relevance}%` }}
                />
              </div>
              <span className="text-accent w-10 text-right">
                {relevance}%
              </span>
              <span className="text-ink-faint">·</span>
              <span className="text-ink-dim">nov={e.novelty}/10</span>
            </div>
          )}

          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-ink-faint tabular-nums">
            {typeof item.signals.stars === "number" && (
              <span title="Stars">
                ★ {item.signals.stars.toLocaleString()}
              </span>
            )}
            {typeof item.signals.forks === "number" && (
              <span title="Forks">
                ⑂ {item.signals.forks.toLocaleString()}
              </span>
            )}
            {typeof item.signals.points === "number" && (
              <span title="Points">
                ↑ {item.signals.points.toLocaleString()}
              </span>
            )}
            {typeof item.signals.comments === "number" && (
              <span title="Comments">⌬ {item.signals.comments}</span>
            )}
            {item.language && (
              <span className="text-ink-dim">{item.language}</span>
            )}
            {c?.farcasterUsername && (
              <a
                href={`https://warpcast.com/${c.farcasterUsername}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-accent no-underline hover:underline"
                title={`${c.farcasterFollowers.toLocaleString()} Farcaster followers`}
              >
                @{c.farcasterUsername}
              </a>
            )}
            {c?.baseContractCount ? (
              <span
                className="text-accent"
                title="Verified contracts deployed on Base"
              >
                {c.baseContractCount} contract
                {c.baseContractCount !== 1 ? "s" : ""}
              </span>
            ) : null}
          </div>

          {e?.stack && e.stack.length > 0 && (
            <div className="mt-1.5 flex flex-wrap gap-x-2 gap-y-0.5 text-[10px] uppercase tracking-wide">
              {e.stack.map((tech) => (
                <span key={tech} className="text-accent">
                  · {tech}
                </span>
              ))}
            </div>
          )}

          {(item.topics?.length ?? 0) > 0 && !e?.stack?.length && (
            <div className="mt-1.5 flex flex-wrap gap-x-2 gap-y-0.5 text-[10px] uppercase tracking-wide">
              {item.topics!.slice(0, 5).map((t) => (
                <span key={t} className="text-ink-faint">
                  · {t}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* actions gutter */}
        <div className="hidden sm:flex flex-col gap-1 shrink-0">
          <button
            onClick={() => onToggleSelect(item.id)}
            title={selected ? "remove from scaffold queue" : "add to scaffold queue"}
            className={`w-7 h-7 border flex items-center justify-center text-sm transition-colors ${
              selected
                ? "border-accent text-accent bg-accent/15 glow"
                : "border-rule text-ink-dim hover:text-accent hover:border-accent"
            }`}
          >
            {selected ? "✓" : "+"}
          </button>
          <a
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            title="open source"
            className="w-7 h-7 border border-rule text-ink-dim hover:text-ink hover:border-rule-hot flex items-center justify-center text-sm no-underline hover:bg-transparent"
          >
            ↗
          </a>
        </div>
      </div>

      {/* mobile actions row */}
      <div className="flex sm:hidden border-t border-rule divide-x divide-rule">
        <button
          onClick={() => onToggleSelect(item.id)}
          className={`flex-1 py-2 text-[11px] uppercase tracking-wide ${
            selected ? "text-accent bg-accent/10" : "text-ink-dim"
          }`}
        >
          {selected ? "✓ queued" : "+ queue"}
        </button>
        <a
          href={item.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 py-2 text-[11px] uppercase tracking-wide text-ink-dim text-center no-underline"
        >
          ↗ open
        </a>
      </div>
    </li>
  );
}

/**
 * CompactRow — dense row for items 6+. Same data density as the old
 * ItemCard but trimmed: tighter padding, no score bar, single-line title.
 * The + toggle still appears on the right so users can pull lower-ranked
 * items into the scaffold queue.
 */
function CompactRow({
  item,
  index,
  revealDelay,
  selected,
  onToggleSelect,
}: {
  item: UnifiedItem;
  index: number;
  revealDelay: number;
  selected: boolean;
  onToggleSelect: (id: string) => void;
}) {
  const e = item.extracted;
  const c = item.creator;
  return (
    <li
      className={`border-b border-rule transition-colors group anim-reveal ${
        selected ? "bg-accent/[0.04]" : "hover:bg-screen-2"
      }`}
      style={{ animationDelay: `${revealDelay}ms` }}
    >
      <div className="px-2 sm:px-3 py-2 flex items-start gap-3">
        <span className="text-ink-faint text-xs pt-0.5 select-none tabular-nums shrink-0">
          {String(index).padStart(2, "0")}
        </span>

        {item.author.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.author.avatarUrl}
            alt={item.author.handle}
            className="w-6 h-6 border border-rule flex-shrink-0"
          />
        ) : (
          <div className="w-6 h-6 border border-rule flex items-center justify-center text-ink-dim text-[10px] flex-shrink-0">
            {item.author.handle.slice(0, 2).toUpperCase()}
          </div>
        )}

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap text-xs">
            <span className="text-ink-faint">
              [{SOURCE_LABEL[item.source]}]
            </span>
            <a
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-ink no-underline hover:text-accent truncate text-sm"
            >
              {item.title}
            </a>
            {e?.maturity && (
              <span className={`${MATURITY_COLOR[e.maturity]} text-[10px]`}>
                [{MATURITY_LABEL[e.maturity]}]
              </span>
            )}
            {c?.hasBasePresence && (
              <span
                title={`${c.baseContractCount} contracts · ${c.baseTxCount} txs`}
                className="text-accent text-[10px] border border-accent px-1"
              >
                BASE
              </span>
            )}
          </div>

          <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-ink-faint tabular-nums">
            {typeof item.signals.stars === "number" && (
              <span>★ {item.signals.stars.toLocaleString()}</span>
            )}
            {typeof item.signals.points === "number" && (
              <span>↑ {item.signals.points.toLocaleString()}</span>
            )}
            {item.language && (
              <span className="text-ink-dim">{item.language}</span>
            )}
            {e && (
              <span className="text-accent">
                {Math.round(e.relevance * 100)}% match
              </span>
            )}
            {c?.farcasterUsername && (
              <span className="text-accent">@{c.farcasterUsername}</span>
            )}
          </div>
        </div>

        <button
          onClick={() => onToggleSelect(item.id)}
          title={selected ? "remove from queue" : "add to queue"}
          className={`shrink-0 w-6 h-6 border flex items-center justify-center text-xs transition-colors ${
            selected
              ? "border-accent text-accent bg-accent/15"
              : "border-rule text-ink-faint hover:text-accent hover:border-accent opacity-0 group-hover:opacity-100"
          }`}
        >
          {selected ? "✓" : "+"}
        </button>
      </div>
    </li>
  );
}
