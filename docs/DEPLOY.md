# Deploy Lodestar

Step-by-step for Vercel + Supabase. Total time: ~15 minutes once accounts are set up.

## Pre-flight

You should already have, from local setup:
- Supabase project with the schema applied (`npm run db:migrate`)
- GitHub OAuth App (for local dev)
- Anthropic API key

## 1. Push the repo to GitHub

```bash
git init
git add .
git commit -m "Initial commit"
gh repo create lodestar --public --source=. --push
```

Keep it **public** if you want Builder Rewards.

## 2. Create a production GitHub OAuth App

You need a separate one from your dev app because the callback URL differs.

1. https://github.com/settings/developers → "New OAuth App"
2. Application name: `Lodestar (production)`
3. Homepage URL: `https://your-domain-tbd.vercel.app` (placeholder, fix after Vercel assigns one)
4. Authorization callback URL: `https://your-domain-tbd.vercel.app/api/auth/callback/github` (placeholder, fix after)
5. Save Client ID, Client Secret

## 3. Get the Supabase connection string for production

Same as local — use the **transaction pooler** (port 6543).

## 4. Import to Vercel

1. https://vercel.com → "Add New…" → Project → Import your GitHub repo
2. Framework preset: Next.js (auto-detected)
3. Don't deploy yet — first add env vars

## 5. Add env vars to Vercel

Settings → Environment Variables. Add for **Production** (and Preview if you want previews to work):

```
AUTH_SECRET              # same as local OR regenerate; same across all envs
AUTH_URL                 # https://your-domain.vercel.app  (set AFTER first deploy)
AUTH_GITHUB_ID           # the new production OAuth app
AUTH_GITHUB_SECRET       # the new production OAuth app secret
DATABASE_URL             # Supabase transaction pooler URL
ANTHROPIC_API_KEY        # same as local
GITHUB_TOKEN             # same as local (optional but recommended)
NEYNAR_API_KEY           # same as local (optional)
BASESCAN_API_KEY         # same as local (optional)
```

## 6. Deploy

Click Deploy. First build takes 2-3 minutes.

## 7. Fix the callback URLs

Now you have a real Vercel domain. Go back to:

- The production GitHub OAuth App → update Homepage URL + Callback URL with the real domain.
- Vercel env vars → update `AUTH_URL` to the real domain → redeploy.

## 8. Smoke test

Visit your Vercel URL:

1. **Boot sequence**: a ~1.7s "system booting" overlay should appear on first visit. Click anywhere or press Esc/Enter/Space to skip. Subsequent loads within the same session skip it automatically (`sessionStorage.lodestar.booted` flag).
2. **Hero observatory**: the landing should show the big ASCII LODESTAR banner with subtle RGB glitch, plus the live SystemStream (events appear every 600-2000ms) and the BasePulse panel (block height counting up + waveform animating).
3. **Quick-start chips**: click any chip in the `chain`, `ai tech`, `kind`, or `stage` rows → it should populate the input and run a search.
4. **Auth**: click "$ login --github" → completes OAuth → you land on `/` authenticated. Try "$ login --wallet" if you have MetaMask/Rabby/Coinbase Wallet extension installed.
5. **Search**: type a query → hits `/api/search` → results render with sources merged, LLM-extracted purpose, novelty + match scores, `[ON BASE]` badges where applicable.
6. **Facets**: above the results, you should see a `▸ FILTERS` block with counters. Click any chip → list filters instantly (no extra API call). Counter updates to "showing X of Y".
7. **Scaffold**: the right column shows the ScaffoldTool with pulsing border. Click "$ scaffold --from-top 5" → after ~25-40s, the panel transforms into the generated project (file tree + viewer + zip download).
8. **Audit**: navigate to `/audit` → paste `framesjs/frames.js` or any public repo → after ~30-50s you get 5-10 improvements sorted by priority with "Copy as Markdown" button.

If any step fails, check Vercel function logs:
- Vercel dashboard → your project → Deployments → click latest → Function Logs

### Accessibility smoke test

Toggle "Reduce motion" in your OS (macOS: System Settings → Accessibility → Display; Windows: Settings → Ease of Access → Display). Reload the site:
- Boot sequence should still show but animations are off
- Logo glitch layers should be invisible
- Cursor blink stops, items appear without stagger
- Layout + content remain identical

If anything still moves with reduced motion on, check `globals.css` `@media (prefers-reduced-motion: reduce)` block.

## Known production gotchas

### `Function execution timeout`

Vercel hobby plan has 10s timeouts on serverless functions. Scaffold + audit endpoints can take 30-60s. Two fixes:
- **Upgrade to Pro** (60s timeout) — simplest
- **Move to Edge runtime** — not viable for the Anthropic SDK in v0
- **Stream the response** — biggest UX win, listed in v1 work

### `Failed to publish search` warnings

These are non-blocking. The user-facing response is fine; the cache write failed and the next search will re-extract. Likely cause: DATABASE_URL is using the direct (IPv6) endpoint instead of the pooler. Verify the URL host is `aws-X-XXXX.pooler.supabase.com`.

### Cookie issues with SIWE

If "Sign in with Wallet" loops back without authenticating:
- Production domain must be served over HTTPS (Vercel does this automatically)
- Browser must allow third-party cookies for the Vercel domain
- The SIWE nonce cookie is set with `secure: true` in production — won't work over plain HTTP

### `invalid EIP-55 address` error on SIWE

If the wallet returns a lowercase address, the `siwe` library rejects it with `line 2: invalid EIP-55 address`. The client uses `viem.getAddress(rawAddress)` to checksum before constructing the SIWE message. If you see this error, verify `app/wallet-connect.tsx` still calls `getAddress` before `new SiweMessage(...)`.

### Boot sequence shows on every refresh

Expected: shows once per browser session, skipped on refresh within the same tab. If it shows on every refresh:
- Check that `sessionStorage` is available (some browsers block it in incognito with strict tracking protection).
- Check that the client component is hydrating — open DevTools console for hydration warnings.

### SystemStream / OnchainPulse appear frozen

The mock data updates client-side via `setInterval`. If they're frozen:
- Check that JavaScript is enabled.
- Check that `prefers-reduced-motion: reduce` isn't active — that pauses several animations.
- Hard refresh (Ctrl+F5) to ensure the latest JS bundle is loaded.

## Custom domain

Vercel → your project → Settings → Domains → add yours. Update:
- `AUTH_URL` env var
- GitHub OAuth App URLs
- Redeploy

## Rolling back

Vercel keeps all deployments. Dashboard → Deployments → ⋯ menu on a previous good one → "Promote to Production". Zero downtime.
