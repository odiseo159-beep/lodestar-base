# Architecture

High-level data flow + key design decisions for Lodestar.

---

## Request lifecycle: `/api/search`

```
                       USER TYPES QUERY
                              │
                              ▼
                   ┌──────────────────────┐
                   │ search-client.tsx    │
                   │ runSearch(query)     │
                   └──────────┬───────────┘
                              │ GET /api/search?q=...
                              ▼
                   ┌──────────────────────┐
                   │ app/api/search/      │
                   │   route.ts           │
                   └──────────┬───────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
        ▼                     ▼                     ▼
  ┌─────────────┐      ┌─────────────┐       ┌─────────────┐
  │ auth()      │      │ getProfile  │       │ searchAll   │
  │ (session?)  │      │ (or DEFAULT)│       │ Sources     │
  └─────────────┘      └─────────────┘       └──────┬──────┘
                                                    │
                              ┌─────────────────────┼─────────────────────┐
                              │                     │                     │
                              ▼                     ▼                     ▼
                    ┌─────────────┐       ┌─────────────┐       ┌─────────────┐
                    │ Octokit     │       │ Algolia HN  │       │ reddit JSON │
                    │ /search/    │       │ Show HN     │       │             │
                    │ repos       │       │             │       │             │
                    └──────┬──────┘       └──────┬──────┘       └──────┬──────┘
                           └──────────────────────┼──────────────────────┘
                                                  │
                                                  ▼
                                       ┌──────────────────────┐
                                       │ dedupeByCanonicalUrl │
                                       │ (github.com/o/r is   │
                                       │  same as hn linking  │
                                       │  to that repo)       │
                                       └──────────┬───────────┘
                                                  │
                              ┌───────────────────┴───────────────────┐
                              │ Promise.all (parallel)                │
                              ▼                                       ▼
                  ┌──────────────────────┐                ┌──────────────────────┐
                  │ enrichGithubCreators │                │ extractMetadata      │
                  │                      │                │  ForItems            │
                  │ - load cache         │                │                      │
                  │ - parallel 3:        │                │ - load cache (7d TTL)│
                  │   * neynar lookups   │                │ - split:             │
                  │   * basescan stats   │                │   * cached items     │
                  │ - skip 429/transient │                │   * cache-miss items │
                  │ - upsert creators_   │                │ - LLM call on misses │
                  │   cache              │                │ - merge results      │
                  └──────────┬───────────┘                │ - upsert repos_cache │
                             │                            └──────────┬───────────┘
                             └───────────────┬────────────────────────┘
                                             │
                                             ▼
                                  ┌──────────────────────┐
                                  │ attach creator to    │
                                  │ matching items       │
                                  └──────────┬───────────┘
                                             │
                                             ▼
                                  ┌──────────────────────┐
                                  │ rankItems(profile)   │
                                  │ relevance + novelty +│
                                  │ stack-match + chain  │
                                  │ + onchain bonus      │
                                  └──────────┬───────────┘
                                             │
                                             ▼
                                  ┌──────────────────────┐
                                  │ persist search       │
                                  │ history (if signed   │
                                  │ in) — fire & forget  │
                                  └──────────┬───────────┘
                                             │
                                             ▼
                                  ┌──────────────────────┐
                                  │ return {             │
                                  │   query, sources,    │
                                  │   enriched, count,   │
                                  │   items              │
                                  │ }                    │
                                  └──────────────────────┘
```

Total time: **17-20s cold**, **<1s warm** (per-item cache hit on `repos_cache`).

---

## Request lifecycle: `/api/scaffold`

```
USER CLICKS "$ scaffold --from-top 5"
            │
            ▼
   POST /api/scaffold { query, items: items.slice(0, 5) }
            │
            ▼
   ┌─────────────────────────────┐
   │ auth() + getProfile (if any)│
   └─────────────┬───────────────┘
                 │
                 ▼
   ┌─────────────────────────────┐
   │ generateScaffold(query,     │
   │                  topItems,  │
   │                  profile)   │
   │                             │
   │  - build compact inspiration│
   │    summary                  │
   │  - LLM call (Sonnet, 16k    │
   │    max tokens, ~30-60s)     │
   │  - parse JSON output        │
   │  - validate + coerce        │
   └─────────────┬───────────────┘
                 │
                 ▼
   ┌─────────────────────────────┐
   │ return { scaffold: {        │
   │   projectName, description, │
   │   stack[], setup[],         │
   │   files[{path, content}],   │
   │   inspiredBy[{title, url,   │
   │              whatWeBorrowed}]│
   │ } }                          │
   └─────────────────────────────┘
            │
            ▼
   client renders ScaffoldPanel inline
   in the right column (replacing ScaffoldTool)
```

Tradeoff: no caching for scaffolds (each one is bespoke to its inputs). Could cache by `sha256(query + sorted item IDs)` in a future iteration.

---

## Request lifecycle: `/api/audit`

```
USER PASTES github.com/owner/repo
            │
            ▼
   POST /api/audit { repoUrl }
            │
            ▼
   parseRepoUrl → {owner, repo}
            │
            ▼
   ┌─────────────────────────────┐
   │ fetchRepoContent            │
   │  - Octokit /repos/get       │
   │  - Octokit /repos/getReadme │
   │  - root contents listing    │
   │  - find manifest            │
   │    (package.json/Cargo.toml │
   │     /pyproject.toml/...)    │
   └─────────────┬───────────────┘
                 │
                 ▼
   ┌─────────────────────────────┐
   │ inferPeerQuery(target)      │
   │ - topics + dedup'd desc     │
   │   words + language          │
   │ - stopword filter           │
   └─────────────┬───────────────┘
                 │
                 ▼
   ┌─────────────────────────────┐
   │ searchAllSources(           │
   │   inferredQuery,            │
   │   sources: github + hn      │
   │ )                           │
   │ - reddit skipped (noisier   │
   │   for peer comparison)      │
   │ - filter out the target itself│
   └─────────────┬───────────────┘
                 │
                 ▼
   ┌─────────────────────────────┐
   │ extractMetadataForItems     │
   │ (reusing the search cache)  │
   └─────────────┬───────────────┘
                 │
                 ▼
   ┌─────────────────────────────┐
   │ generateAudit(target,       │
   │                peers,       │
   │                inferredQuery,│
   │                profile)     │
   │                             │
   │  - LLM call (Sonnet, 8k max │
   │    tokens, ~30-50s)         │
   │  - parse + validate JSON    │
   │    output                   │
   └─────────────┬───────────────┘
                 │
                 ▼
   return { audit: {
     repo, summary, strengths[],
     inferredQuery, peers[],
     improvements[{
       category, title, detail,
       priority, effort,
       inspiredBy?
     }]
   } }
```

---

## Caching layers

| Cache | Where | TTL | Win |
|---|---|---|---|
| **Per-item LLM extraction** | `repos_cache` table, keyed by `(source, sourceId)` | 7 days | Same item appearing in multiple searches doesn't re-pay LLM |
| **Creator enrichment** | `creators_cache` table, keyed by `githubHandle` | 24 hours | Same creator appearing in multiple searches doesn't re-hit Neynar + Basescan |
| **Source response cache** | Next.js `fetch({ next: { revalidate: 600 } })` on HN + Reddit + Neynar + Basescan | 10 min — 1 hour | Multiple identical queries don't re-hit upstream |
| **In-memory** | None | — | We rely on the DB-level caches; serverless can't share memory anyway |

**Failure modes**:
- 429s from Neynar are **caught and re-thrown** so we don't cache "no Farcaster match" wrongly. The `transientError` flag in `enrich-creator.ts` ensures only confirmed 404s + successful lookups land in the cache.
- LLM parse failures fall through to "return items unenriched" — UI still renders without extracted metadata.

---

## Database schema

8 tables, generated migrations in `lib/db/migrations/`:

```
auth tables (managed by @auth/drizzle-adapter):
  user                  id, name, email?, walletAddress? (unique), image, createdAt
  account               userId, provider, providerAccountId, tokens (Auth.js OAuth state)
  session               sessionToken, userId, expires (mostly unused — using JWT)
  verificationToken     (email auth — unused but adapter requires it)

lodestar tables:
  search                userId, query, sources[], resultsCount, createdAt
  repos_cache           source + sourceId (unique idx), fullName, data jsonb, fetchedAt
  profile               userId (unique), axes jsonb, updatedAt
  creators_cache        githubHandle (unique), farcasterFid?, farcasterUsername?,
                        verifiedAddresses jsonb, baseContractCount, baseTxCount,
                        data jsonb, fetchedAt
```

**`data` jsonb columns**: schemaless on purpose. Iterating on what we cache without migrations.

---

## Auth flow: SIWE (Sign in with Ethereum)

```
USER CLICKS "$ login --wallet"
            │
            ▼
   window.ethereum.request({ eth_requestAccounts })
   → wallet popup asks user permission
   → returns rawAddress (often lowercase)
            │
            ▼
   viem.getAddress(rawAddress) → EIP-55 checksummed
            │
            ▼
   GET /api/auth/siwe/nonce
   → server generates random nonce
   → sets HTTP-only cookie `lodestar.siwe-nonce` (10 min TTL)
   → returns nonce as text
            │
            ▼
   new SiweMessage({
     domain, address, chainId: 8453, nonce, ...
   }).prepareMessage()
            │
            ▼
   window.ethereum.request({
     method: "personal_sign",
     params: [message, address]
   })
   → wallet popup asks user to sign
   → returns signature
            │
            ▼
   server action signInWithSiwe(message, signature)
            │
            ▼
   Auth.js Credentials provider authorize():
     - reads nonce cookie
     - SiweMessage.verify({ signature, nonce })
     - on success: upsert users row by walletAddress
     - delete the nonce cookie (anti-replay)
            │
            ▼
   Auth.js mints JWT, sets session cookie, redirects to /
```

**Why not `@auth/drizzle-adapter` for SIWE**: Auth.js's Credentials provider doesn't go through the adapter. The adapter is for OAuth flows only. SIWE's authorize() callback manually upserts the user.

---

## Why this layout

| Decision | Why |
|---|---|
| **Two-pane split (results \| tools)** instead of stacked | Right column is the workflow companion — sticky as you scroll results, always visible. Mirrors IDE side panels. |
| **Sticky right column, internal scroll on ScaffoldPanel** | Scaffold output is tall; keeping the panel sticky with its own scroll feels more like a workbench than a long page. |
| **Empty state as full-screen hero observatory** | First impression matters. A static empty state would be forgettable. The live SystemStream + OnchainPulse make the product feel alive immediately. |
| **Auto-extracted facets vs static category UI** | The categories that exist for "AI agents" are different from those for "x402 payment". Letting facets emerge from the actual result set keeps them relevant. |
| **Hero chips trigger fresh searches, facets filter locally** | They serve different intents: hero chips are for *discovering what to explore*, facets are for *refining what was found*. Different UX. |
| **Logo glitch via dual transparent layers** instead of one element with text-shadow animation | Clip-path slices on independent layers produce the iconic "RGB tear" — separate horizontal bands shifting in red and blue. Single-element text-shadow can't do horizontal slice masking. |
| **`prepare: false` on the postgres driver** | Supabase's pooler is in transaction mode → no prepared statements. Required to avoid runtime errors. |
| **Migration files versioned, not `db:push`** | `db:push` requires interactive confirmation that doesn't work in non-TTY environments (CI, scripts, our deploy flow). Generate + apply via the programmatic migrator is reproducible. |

---

## Performance notes

- **First contentful paint**: <500ms after boot sequence (which is itself optional skip-able overlay).
- **TTFB on search**: <100ms (just opens streams to upstream APIs).
- **Full response time on search**:
  - Cold (no cache): ~12-18s (3 sources in parallel ~3-5s + LLM extraction ~5-12s).
  - Warm (cache hit): ~600ms-1.5s (parallel source fetches + zero LLM).
- **Anim throttling**: SystemStream + OnchainPulse intervals are 600-2200ms — well below the noticeable jank threshold. `tabular-nums` prevents layout shift from updating digit widths.
- **No client-side state libraries**. React `useState` + props. SearchClient state graph is manageable enough not to need Zustand/Redux.

---

## Build/deploy

- **Next.js 16**, App Router, Turbopack dev.
- All API routes are dynamic (`ƒ` in the build output). No static prerendering for app pages because they all touch session.
- **No middleware** — auth is enforced in each route. Could move to `middleware.ts` if more routes need protection.
- **Drizzle migrations** run via `npm run db:migrate` (custom programmatic migrator in `lib/db/migrate.ts` — bypasses `drizzle-kit push`'s interactive prompt).
- See [DEPLOY.md](DEPLOY.md) for Vercel + Supabase setup.
