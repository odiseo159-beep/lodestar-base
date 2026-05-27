# Lodestar

> Discover the best repos, projects and creators — curated by an agent. On Base.

Lodestar is a tool-using planner agent for builders. Type what you want to build; the agent reads GitHub, Hacker News, and Reddit in parallel, cross-links creators to Farcaster + Base onchain activity, ranks results against your personal profile, then scaffolds a starter project or audits one you already have.

The whole thing is wrapped in a **terminal-themed UI** with a live "agent observatory" hero — system activity stream, Base mainnet pulse, ASCII art logo with subtle VHS glitch — so the product feels like a command center, not a search box.

---

## What makes it different

Every coding agent (Cursor, v0, bolt, Devin) is a generator. Lodestar is a **discoverer + curator** first — it pulls signal that pure GitHub search doesn't see:

- **Onchain signal**: cross-link GitHub handle → Farcaster username → verified Base addresses → contract activity. Creators with real Base traction get ranked higher.
- **LLM curation, not stars**: a 470k-star awesome-list scores 1/10 novelty and lands at the bottom. A 50-star real project scores 8/10 and lands at the top.
- **Personal profile**: same query, different profiles → different rankings. Stacks, domains, novelty appetite, onchain importance all factor in.
- **Faceted filtering**: post-search, narrow by `source`, `maturity`, `stack`, `chain`, `ai tech`, `onchain` — counters update live, no extra API calls.

---

## Flow

```
┌──── HERO (empty state) ─────────────────────────────────────────┐
│  [LODESTAR ASCII banner with glitch] // tagline                  │
│  > what do you want to build?                                    │
│  [ai agents | x402 | farcaster frame | ...]              [run ↵] │
│                                                                   │
│  quick start                                                      │
│  chain    [base] [ethereum] [solana] [arbitrum] [optimism]       │
│  ai tech  [claude] [mcp] [hermes] [langchain] [agent sdk]        │
│  kind     [agent] [defi] [wallet] [frame] [x402] [identity]      │
│  stage    [hackathon] [production]                                │
│                                                                   │
│  ┌─ ● SYSTEM ACTIVITY ────────┐ ┌─ ● BASE PULSE ──────────────┐ │
│  │ live agent operations feed │ │ block + waveform + builders │ │
│  └────────────────────────────┘ └─────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
              │
              ▼  (search submitted)
┌──── WORKING MODE ───────────────────────────────────────────────┐
│  [compact logo + nav]                                            │
│  > query                                                  [run ↵]│
│                                                                   │
│  ▸ FILTERS  · 24 items · click to filter            [× clear]    │
│  source: [13 github] [7 hn] [4 reddit]                           │
│  maturity: [12 prod] [9 early] [3 toy]                           │
│  ai tech: [6 claude] [4 mcp] [3 openai] ...                      │
│                                                                   │
│  ┌── RESULTS (left) ────────────┐ ┌── SCAFFOLD TOOL (right) ──┐ │
│  │ 01 [HN] item with metadata   │ │ ● tool / scaffold  01/02  │ │
│  │ 02 [GH] item with metadata   │ │ $ npm create <new-project>│ │
│  │ ...                          │ │ will generate: 5-8 files  │ │
│  │                              │ │ [ $ scaffold --from-top 5 │ │
│  └──────────────────────────────┘ └───────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
              │
              ▼  ($ scaffold clicked)
┌──── SCAFFOLD GENERATED ─────────────────────────────────────────┐
│  Project name + stack + setup commands + file tree viewer       │
│  ─ inspired-by citations linking back to discovered items       │
│  [download N files .zip]                                         │
└─────────────────────────────────────────────────────────────────┘
```

Plus `/audit` for the same pipeline applied to an existing repo URL.

---

## Visual identity

Terminal aesthetic from the ground up:

- **Pure black background** (`#000`) with **Base blue accent** (`#4d8ef4`) — lifted +2 steps from official Base blue for readability on near-black.
- **Geist Mono everywhere** — no sans-serif. Sharp 1px borders, zero rounding globally enforced.
- **CRT atmospherics**: scanline overlay (2% opacity), radial vignette, very rare full-screen flicker every 22s, phosphor glow on accent text.
- **VHS-style logo glitch**: dual RGB layers (red + blue) with clip-path slices animating at 5.7s/6.2s out of phase — short tearing bursts every 2-3s.
- **Boot sequence** on first session load (5 lines of fake system init, ~1.7s, click/Esc to skip, `sessionStorage` flag).
- **Agent observatory hero**: live SystemStream + OnchainPulse panels with mock data updating every 600-2200ms. Bouncing block ASCII progress bar instead of spinners.

Full design system reference: [docs/DESIGN.md](docs/DESIGN.md)

---

## Two modes

1. **Discover + Scaffold** (`/`) — type what you want to build (or click a quick-start chip), get curated items, click "$ scaffold --from-top 5" → agent generates a runnable starter repo (real `package.json` deps, README, source files, env example). Download as zip.
2. **Audit** (`/audit`) — paste a GitHub repo URL → agent finds peers via the same pipeline, compares patterns, returns 5-10 prioritized improvements with category (quick-win / docs / security / pattern-gap / infra / stack / novelty) + effort + inspiration citations. Copy as markdown.

---

## Stack

- **Frontend**: Next.js 16 (App Router) + Tailwind v4 + Geist Mono
- **Auth**: Auth.js v5 — GitHub OAuth + Sign in with Ethereum (SIWE, EIP-4361, viem getAddress for EIP-55 checksum)
- **Agent**: Anthropic SDK (Claude Sonnet 4.5)
- **DB**: Postgres (Supabase transaction pooler) + Drizzle ORM
- **Onchain**: viem + Neynar (Farcaster) + Basescan
- **Storage**: JSZip for download-as-zip of scaffolded projects
- **Hosting**: Vercel (web) + optional Railway (worker if cron added later)

---

## Local setup

Prerequisites: Node 22+, a Supabase project, a GitHub OAuth App.

```bash
git clone <this-repo>
cd lodestar
npm install
cp .env.example .env.local
# fill in .env.local — see the comments in each block
npm run db:generate
npm run db:migrate
npm run dev
```

Open http://localhost:3000.

### Required env vars

| Var | What | Where to get it |
|---|---|---|
| `AUTH_SECRET` | random 32 bytes base64 | `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"` |
| `AUTH_GITHUB_ID` / `AUTH_GITHUB_SECRET` | GitHub OAuth app | https://github.com/settings/developers |
| `DATABASE_URL` | Postgres pooler URL | Supabase → Connect → ORM → Drizzle (port 6543) |
| `ANTHROPIC_API_KEY` | LLM (Sonnet 4.5) | https://console.anthropic.com |
| `GITHUB_TOKEN` | raise rate limit 60 → 5000/hr | https://github.com/settings/tokens (fine-grained, public repos read) |

### Optional env vars

| Var | What | Effect if missing |
|---|---|---|
| `NEYNAR_API_KEY` | Farcaster lookups | No cross-linking to Farcaster |
| `BASESCAN_API_KEY` | Base contract activity | No "on Base" badge |
| `TALENT_PROTOCOL_API_KEY` | Talent Builder Score | Currently unused (API is paid, $4.90/mo+) |

---

## Deploy

See [docs/DEPLOY.md](docs/DEPLOY.md) for the step-by-step Vercel + Supabase guide.

TL;DR: push to GitHub, import in Vercel, add the same env vars, update GitHub OAuth callback URL to the Vercel domain, deploy.

---

## Project layout

```
app/
  api/
    auth/             Auth.js handler + SIWE nonce endpoint
    search/           /api/search — discovery pipeline
    scaffold/         /api/scaffold — generate starter repo
    audit/            /api/audit — audit existing repo
    profile/          /api/profile — user profile CRUD
  audit/              /audit page + form
  profile/            /profile page + form
  page.tsx            / (server) — fetches session, hands to SearchClient
  search-client.tsx   Main UI shell — hero mode + working mode + filter state

  # Hero observatory components
  hero-section.tsx    Composition: logo + tagline + search + tags + panels
  ascii-logo.tsx      ANSI Shadow banner + dual-layer RGB glitch
  ascii-progress.tsx  Bouncing block ASCII loader [██▓▒░░░░░░]
  typing-prompt.tsx   Self-typing placeholder cycling 9 example queries
  system-stream.tsx   Mock live agent activity feed
  onchain-pulse.tsx   Base mainnet stats + ASCII waveform + top builders
  hero-tags.tsx       Quick-start chips (chain, ai tech, kind, stage)
  boot-sequence.tsx   First-load fake boot animation

  # Working-mode components
  scaffold-tool.tsx   Right-rail widget (stage 01) — preview + CTA + ready pulse
  scaffold-panel.tsx  Generated project viewer (stage 02) — files + zip download
  results-facets.tsx  Auto-extracted filter chips with counters
  wallet-connect.tsx  SIWE flow client component
  auth-actions.ts     Server actions for sign-in/out

lib/
  agent/              LLM-driven steps
    extract.ts          Batch metadata extraction + per-item cache check
    extraction-cache.ts repos_cache lookups + upserts (7-day TTL)
    enrich-creator.ts   GitHub → Farcaster → Base addresses → contract count
    score.ts            Personalized ranking using ProfileAxes
    scaffold.ts         Generate project blueprint (~16k token output)
    audit.ts            Compare target repo vs peers, return improvements

  sources/            External APIs
    github.ts           Repo search via Octokit
    github-repo.ts      Single-repo read (metadata + README + manifest)
    hackernews.ts       HN Show via Algolia (no auth)
    reddit.ts           Reddit JSON search (subreddit-biased)
    farcaster.ts        Neynar v2 user-by-username
    basescan.ts         Etherscan-compatible tx + contract activity
    types.ts            UnifiedItem + ExtractedMetadata + CreatorOnchain
    index.ts            Aggregate all sources + canonical-URL dedup

  profile/            User profile
    types.ts            ProfileAxes (stacks, domains, audience, weights)
    repository.ts       getProfileAxes + upsertProfileAxes

  tags.ts             Hero chip taxonomy + facet computation + filter logic

  db/                 Drizzle
    schema.ts           users, accounts, sessions, searches, repos_cache, profiles, creators_cache
    migrations/         Generated SQL files (versioned, committable)
    migrate.ts          Programmatic migrator (used by `db:migrate` script)
    index.ts            Postgres client + drizzle instance (prepare: false)

  auth.ts             Auth.js config (GitHub OAuth + SIWE Credentials)
  anthropic.ts        Claude client + model identifiers

docs/                 DEPLOY.md, DESIGN.md, ARCHITECTURE.md

scripts/
  test-scoring.ts     Verifies same dataset, different profiles → different rankings
```

---

## Tag system

Two complementary tag UIs:

### Hero chips (empty state)
Pre-defined queries grouped by category. Click a chip → seeds the search input + submits immediately. Designed to lower friction for new users:

```
chain    [base] [ethereum] [solana] [arbitrum] [optimism]
ai tech  [claude] [mcp] [hermes] [langchain] [agent sdk] [claude code]
kind     [agent] [defi] [wallet] [frame] [x402] [identity]
stage    [hackathon] [production]
```

Defined in `lib/tags.ts` → `HERO_CATEGORIES`. Add new categories by appending to that array.

### Working-mode facets
Auto-extracted from the result set with live counters. Click filters locally (no extra API/LLM calls):

- `source` — github / hn / reddit
- `maturity` — toy / early / production (from LLM extraction)
- `stack` — TypeScript / Python / Rust / Solidity / viem / Foundry / ...
- `chain` — base / ethereum / solana / arbitrum / optimism / polygon / starknet / zksync / linea
- `ai tech` — claude / anthropic / gpt / openai / mcp / hermes / langchain / llama / mistral / agent sdk
- `onchain` — creators with verified Base activity

Filter semantics:
- **Within a category**: OR (clicking `[github] [hn]` shows items from either)
- **Across categories**: AND (clicking `[claude] [production]` shows production items mentioning claude)
- **Reset**: `[× clear]` button or automatic on new search

Detection is word-boundary safe — "base" won't match "database". Extracted from title + description + topics + extracted.stack + extracted.purpose.

---

## Builder Rewards eligibility

If you want to qualify for [Base Builder Rewards](https://docs.base.org/apps/growth/rewards):

1. Make this repo **public** on GitHub.
2. Claim a [Basename](https://www.base.org/names) and connect the same wallet to your GitHub account.
3. Deploy at least one **verified contract** on Base (even a trivial `Hello.sol` counts). Verification on Basescan + matching ABI is required.
4. Sign in to https://talent.app and link your Basename + GitHub. Builder Score updates automatically.

Top 100 by Builder Score split 2 ETH/week.

---

## Cost notes

- **Cold search** (~12 items, full LLM extraction): ~$0.02–0.05
- **Warm search** (items already extracted, query unchanged): ~$0 — cached per-item in `repos_cache` for 7 days
- **Scaffold generation**: ~$0.10–0.20 (longer output, max 16k tokens). Not cached.
- **Audit generation**: ~$0.08–0.15 per repo.
- Supabase free tier (500MB / 50k MAU): plenty for v0.
- Vercel hobby tier: fine for v0; bump to Pro if scaffold/audit functions hit the 10s timeout (they often do — consider streaming or a separate Railway worker).

---

## Accessibility

- **Reduced motion**: full `prefers-reduced-motion: reduce` support — disables boot sequence animation, cursor blink, logo glitch, item-reveal stagger, glitch flash, screen flicker. Layout and content stay intact.
- **Color contrast**: monochrome on near-black hits WCAG AA at the default sizes. Accent blue (`#4d8ef4`) hits AA on `#000` for body text and AAA for large text.
- **Keyboard**: search input is autofocus-friendly; `Enter` submits; chip and facet buttons all reachable via tab.
- **Screen readers**: ASCII art logo is `aria-hidden` with a visually-hidden `<span class="sr-only">Lodestar</span>` alternative.

---

## Honest gaps in v0 (known)

- **Farcaster match rate ~5–15%** for crypto-adjacent GitHub orgs. Most orgs/devs don't use the same handle on both. Bumping match rate requires fuzzy match + bio parsing (TODO).
- **Peer pool can be sparse** for niche audit queries. Mitigation: LLM-based query refinement, or fall back to broader query (TODO).
- **No mobile wallet** in SIWE flow (only browser extensions like MetaMask, Rabby, Coinbase Wallet extension). WalletConnect would unlock Coinbase Wallet mobile, Rainbow mobile, etc.
- **Builder Rewards leaderboard is mock** in `OnchainPulse` — real Talent Protocol API requires paid plan ($4.90/mo+). Hard-coded for v0.
- **No subscription billing** — currently free for anyone with the env vars.
- **No streaming responses** — scaffold/audit endpoints block until LLM finishes (~25–60s). Server-sent events would feel much faster.
- **No real-time signal in SystemStream** — events are generated client-side from templates. Wiring real backend events via WebSocket/SSE would be a v1 win.

---

## License

MIT. Use it, fork it, ship something.
