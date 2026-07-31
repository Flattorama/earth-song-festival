# CLAUDE.md — Earth Song Festival

Guidance for Claude Code working in this repo. Read this before making changes.

---

## ⚠️ Read this first: this is a live site selling tickets

`.github/workflows/deploy.yaml` triggers on **push to `main`** and does two irreversible things:

1. `npx supabase db push --linked` — **applies migrations to the production database**
2. Builds and deploys to GitHub Pages at `earthsongfestival.com`

There is no staging environment. The festival is **August 7–9, 2026** and tickets are on sale.

### Hard rules

- **Never commit to `main`. Never merge to `main`. Never push to `main`.**
- Work on a feature branch. Push the branch, open a PR, then **stop and report**. A human merges.
- **Never run `supabase db push`, `supabase functions deploy`, or any `supabase link` command.** Deployment is the human's job.
- **Never write, print, echo, or commit secret values.** Not into files, not into commit messages, not into terminal output. If a task needs a secret that isn't set, say so and stop.
- **Never modify `.env.local`** or add secrets to any tracked file.
- Migrations are **additive only**: `ADD COLUMN IF NOT EXISTS`, `CREATE TABLE IF NOT EXISTS`. No `DROP`, no destructive `ALTER`, no `UPDATE`/`DELETE` on existing rows without explicit human approval in the task.
- If a change would alter Stripe pricing, ticket amounts, or the `payment_method_configuration` ID, **stop and ask.** Money bugs are worse than late features.

---

## Architecture

Vite + React 18 + TypeScript SPA, deployed as static files to GitHub Pages. All server logic lives in Supabase edge functions (Deno). Payments via Stripe Checkout.

```
src/
  pages/            Index, PaymentSuccess, SignWaiver, AdminDashboard, NotFound  (routes in App.tsx)
                    — SignWaiver is being deleted by the current migration
  components/       Feature sections (HeroSection, TicketsSection, …) + ui/ (shadcn)
  components/ui/    shadcn/ui primitives — do not edit these by hand
  data/             Static content (facilitators, schedule)
  integrations/supabase/client.ts   Browser client, anon key, RLS-bound
supabase/
  functions/<name>/index.ts         Deno edge functions
  migrations/*.sql                  Applied in filename order by CI
public/             Copied verbatim to the site root by Vite
```

### Key facts that are easy to get wrong

- **The browser client is anon-key only, and cannot read any attendee or purchase data.** Any data the UI needs must come through an edge function. But the RLS pattern is not uniform, so check the migration before assuming:
  - `purchases`, `attendees`, `minor_waiver_acceptances` — service-role-only policy plus `REVOKE ALL … FROM anon, authenticated`. Fully locked.
  - `waiver_acceptances` — RLS on with **no SELECT policy**, so reads are denied by default, but there is no `REVOKE` and its INSERT policy has no `TO service_role` clause. Reads are safe; writes are not. See the security note below.
  - `referral_codes` — deliberately readable by `anon` (`FOR SELECT TO anon, authenticated`). This is the only table the browser reads directly, for referral code validation.
  - `newsletter_signups`, `volunteer_applications` — deliberate anon INSERT policies.
  - `stripe_customers`, `stripe_subscriptions`, `stripe_orders` — user-scoped policies for `authenticated`.

> 🔒 **Known pre-existing issue, do not fix without asking.** `waiver_acceptances` (migration `20260401170146_*.sql:13-18`) enables RLS and adds `CREATE POLICY … FOR INSERT WITH CHECK (true)` with no `TO service_role` and no `REVOKE`. `anon` keeps its default INSERT grant, so **a browser can insert arbitrary rows into `waiver_acceptances`**. Reads are still blocked. Flag it to the human rather than silently changing security policy mid-migration; that table is being retired as a write target anyway.
- **Edge functions run on Deno**, not Node. Import via URL (`https://esm.sh/@supabase/supabase-js@2.49.4`) or `npm:` / `jsr:` specifiers. Existing functions use both styles; match the file you are editing.
- **Every new edge function needs three registrations** or it silently never deploys:
  1. `supabase/config.toml` → `[functions.<name>]` / `verify_jwt = false` — only needed for functions that skip JWT verification, which is all of ours except `stripe-checkout`
  2. `.github/workflows/deploy.yaml` → a `functions deploy <name> … --no-verify-jwt` line
  3. Its secrets added in the Supabase dashboard (human does this)

  `sync-reconcile` is missing 1 and 2 — it was deployed by hand. Do not copy that omission.
- **Prices are defined in three places, in two different units.** Change all of them or you ship a mispriced ticket:
  1. `src/components/TicketsSection.tsx` — adult display prices as **dollar strings** (`"CA$299"`)
  2. `src/components/WaiverDialog.tsx` → `youthPricing` — youth prices as **dollar numbers** (`150`)
  3. `supabase/functions/create-checkout/index.ts` → `TICKETS` and `YOUTH_TICKETS` — both adult and youth in **cents** (`29900`)

  Number 3 is authoritative and must never trust a client-supplied amount. A parity test between client and server must convert dollars ×100 — the tables are not structurally identical (different shapes, different label text), so deep equality will never hold.
- **Stripe metadata values cap at 500 characters.** Keep metadata terse.
- The `attendees` table has `UNIQUE (purchase_id, email)`. Rows with an empty email collide.

---

## Commands

Run from the repo root:

```bash
npm ci                                   # install
npm run lint                             # eslint — may pass with pre-existing Fast Refresh warnings in components/ui/
npm run build                            # vite build — BUNDLE ONLY, does not type-check
npm test                                 # vitest run
npx tsc --noEmit -p tsconfig.app.json    # the actual type gate — run this too
```

> ⚠️ **`npm run build` is `vite build` alone** — there is no `tsc` step, and the SWC plugin transpiles without type-checking. A build can pass with type errors and broken imports. **Always run `npx tsc --noEmit -p tsconfig.app.json` as well** and treat it as the real gate.
>
> Be aware the type config is also permissive: `strict: false`, `noImplicitAny: false`, `strictNullChecks: false`. So even a clean `tsc` proves less than usual. Compensate with tests, and hold new code to a higher standard than the config enforces.

**Before reporting any task complete, run all five commands above.** A task is not done if any of them fails.

Deno functions are not covered by the above. Syntax-check them with:

```bash
node -e "const ts=require('typescript'),fs=require('fs');const f=process.argv[1];const sf=ts.createSourceFile(f,fs.readFileSync(f,'utf8'),ts.ScriptTarget.ESNext,true);console.log(f, sf.parseDiagnostics.length?'SYNTAX ERRORS':'OK');sf.parseDiagnostics.forEach(d=>console.log(ts.flattenDiagnosticMessageText(d.messageText,' ')))" supabase/functions/<name>/index.ts
```

There is a testing skill at `.agents/skills/testing-earthsong-checkout/SKILL.md` with live-checkout test procedures. Read it before writing checkout tests.

---

## Conventions

- **TypeScript**, no `any` in new code. Type edge-function request bodies explicitly and validate at the boundary — these endpoints are public (`verify_jwt = false`).
- **Tailwind** utility classes only; theme tokens are in `tailwind.config.ts` and `src/index.css`. Use semantic tokens (`text-primary`, `bg-background`, `border-border`), not raw hex.
- **shadcn/ui** for primitives — import from `@/components/ui/*`. Don't hand-roll a button or dialog.
- `@/` is the alias for `src/`.
- Toasts: `sonner` (`import { toast } from "sonner"`).
- Icons: `lucide-react`.
- Edge functions: return `corsHeaders` on every response including `OPTIONS`; log errors with a `[function-name]` prefix; never leak a raw error object to the client on a 500 path that a stranger can reach.
- Comments explain **why**, not what. Skip the comment if the code already says it.

---

## Current work: waiver migration

The active project is documented in **`../waiver-migration-plan.md`** (one directory up, outside the repo). Read it before starting any waiver-related task — it contains the full rationale, the Smartwaiver API constraints, and the sequencing.

Summary of the change: the in-checkout waiver modal is being removed. Stripe Checkout collects name and email only; a Supabase function then emails the buyer a Smartwaiver link; a Smartwaiver webhook marks the waiver signed.

### Things about this migration that will bite you

- **`send-waiver-emails` does not exist.** `src/pages/PaymentSuccess.tsx:132` invokes it. It has never been in the repo or the deploy workflow. Do not assume other referenced functions exist — check.
- **`src/components/Footer.tsx` imports `WaiverContent.tsx`** (line 12, rendered line 144). Deleting `WaiverContent.tsx` without editing `Footer.tsx` breaks the build.
- **Saturday's youth pass type is keyed `"day"`, not `"saturday"`.** See `forcedYouthPassType` in `WaiverDialog.tsx` and `DAY_PASS_YOUTH_REQUIREMENT` in `create-checkout/index.ts`. Breaking this mis-prices Saturday youth tickets silently.
- **Smartwaiver has no email-sending API endpoint.** Do not go looking for one. Email goes out via Resend from our own function.
- Two Smartwaiver identifiers matter: `external_id` (set on prefill, max 128 chars, **alphanumeric and underscores only** — so strip the dashes from a UUID) and `auto_tag` (URL param, max 64 chars). Both come back on the signed waiver and are how a signature is matched to a purchase.
- Smartwaiver webhooks **retry every 5 minutes, 5 times, on any non-2xx** and then cancel permanently. The webhook handler must return 2xx for anything it has already processed or cannot match, and must be idempotent.

---

## When you are unsure

Stop and ask. Specifically stop and ask if a task seems to require:

- pushing or merging to `main`
- running a Supabase deploy or `db push`
- a secret that isn't already set
- changing a ticket price or Stripe configuration
- deleting or rewriting existing attendee, purchase, or waiver rows

Guessing on any of those costs more than the question.
