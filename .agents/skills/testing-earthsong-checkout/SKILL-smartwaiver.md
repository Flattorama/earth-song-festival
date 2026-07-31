# Earth Song Checkout Testing — Smartwaiver flow (Aug 2026 onward)

Companion to `SKILL.md`, which documents the **retired** in-checkout waiver flow.
Use this file for anything after the Smartwaiver migration. The old file is kept
because purchases made before the change still have `waiver_acceptances` and
`minor_waiver_acceptances` rows that ops may need to reason about.

## What changed

| Before | Now |
|---|---|
| 603-line `WaiverDialog` collected the full waiver at checkout | `TicketPicker` collects name, email, referral code and youth counts |
| Minor name, DOB, guardian initials, two consent checkboxes | None of it — those fields live on the Smartwaiver form |
| `minorTickets: [{minorName, minorDateOfBirth, passType, ageBand}]` | `youthCounts: { weekend: { "13-18": 2 } }` |
| `create-checkout` wrote `waiver_acceptances` + `minor_waiver_acceptances` | `create-checkout` writes nothing to Supabase |
| Buyer attendee created `waiver_status: 'signed'` | Created `'pending'`; Smartwaiver webhook flips it to `'signed'` |
| Second waiver UI at `/sign-waiver/:token` | Deleted. Waiver arrives by email |
| `PaymentSuccess` collected extra attendees | `PaymentSuccess` shows a "Sign my waiver now" button |

## Secrets

Everything in `SKILL.md` still applies, plus:

- `SMARTWAIVER_API_KEY`, `SMARTWAIVER_TEMPLATE_ID` (`9cayh4ucp8knmwybehfh4a`)
- `SMARTWAIVER_WEBHOOK_SECRET` — must equal the `?k=` on the registered webhook URL
- `WAIVER_EMAIL_FROM` — Resend-verified, participant-facing (not `alerts@`)
- `INTERNAL_FUNCTION_TOKEN` — guards `send-waiver-email`
- `CHECKIN_TOKEN`, `FESTIVAL_START_DATE` (`2026-08-07`)

Never print a secret value. Decoding a public JWT's claims to compare project refs
is fine; logging raw tokens is not.

## Project commands

Unchanged, and all five must pass:

```bash
npm ci
npm run lint          # passes with 7 pre-existing react-refresh warnings in components/ui/
npm run build         # vite build ONLY — does not type-check
npm test
npx tsc --noEmit -p tsconfig.app.json   # the actual type gate
```

## Unit tests that already cover the risky parts

`npm test` runs 75 tests. The ones worth knowing about:

- `pricing-parity.test.ts` — imports both the browser table (dollars) and the real
  server catalog (cents) and asserts `dollars * 100 === cents`. Verified to fail
  when either side is edited alone.
- `create-checkout.test.ts` — rejection cases (count of 0, count of 11, fractional,
  unknown band, unknown pass type, the old `minorTickets` array shape), the
  day-pass restriction in both directions, and `youth_bands` staying under
  Stripe's 500-char cap.
- `smartwaiver-webhook.test.ts` — match ordering and its short-circuiting, minor
  synthetic-email determinism and collisions.
- `waiver-reconcile.test.ts` — the reminder cadence, the 5-reminder cap and the
  one-per-day rule.

**`saturday-day-pass` maps to youth pass type `"day"`, not `"saturday"`.** Several
tests assert this specifically. If you are changing pricing code and they fail,
the tests are right.

## Live checkout UI test

1. Open `https://earthsongfestival.com/?checkout-test=<timestamp>`.
2. Click **Buy Tickets**, then a ticket CTA.
3. In the picker, fill Full Name `Devin Checkout Tester` and Email
   `devin-checkout-<timestamp>@example.com`.
4. Add youth tickets with the `+` counters. Untouched bands must be omitted from
   the request — the server rejects a count of `0`.
5. Click **Continue to Payment** and assert the redirect to `checkout.stripe.com`.
   Stop there unless you intend to pay.

To inspect the request without paying, patch `window.fetch` before submitting and
capture the `create-checkout` body. Expected shape for a Saturday pass:

```json
{
  "ticketType": "saturday-day-pass",
  "customerName": "…",
  "customerEmail": "…",
  "youthCounts": { "day": { "13-18": 2, "under-2": 1 } }
}
```

> Driving the UI from a script, put the counter clicks and the submit click in
> **separate** evaluations. React batches state updates, so doing both in one
> synchronous block makes the submit handler read pre-click state and send
> `youthCounts: {}`. That is a test artifact, not a bug.

## Stripe line-item assertions

Free bands (`under-2`) are counted in metadata but never sent to Stripe — a
zero-amount line item is rejected. So for the payload above expect:

- adult `saturday-day-pass` @ `15000` × 1
- Saturday youth 13-18 @ `10000` × **2** (quantity, not two separate lines)
- no line for the under-2
- metadata: `youth_ticket_count: "3"`, `total_ticket_count: "4"`,
  `youth_bands: {"day":{"13-18":2,"under-2":1}}`

## End-to-end waiver test

1. Complete a Stripe **test mode** purchase.
2. `stripe-webhook` upserts the purchase and the buyer attendee as `'pending'`,
   then calls `send-waiver-email`. That call is wrapped so a failure can never
   return non-2xx to Stripe.
3. Confirm the email arrives and the prefill link opens with name and email
   filled in.
4. Sign it. Smartwaiver redirects to `/waiver-complete`.
5. Confirm `smartwaiver-webhook` fired and the attendee flipped to `'signed'`
   with `waiver_signed_at` set from the waiver's `createdOn`, not `now()`.
6. If minors were added, confirm one extra `attendees` row per minor on the same
   purchase, `is_minor = true`, with a `minor.<slug>@<hex>.invalid` address.

## Idempotency and failure paths

The webhook must answer **2xx for everything it has handled, cannot match, or
chooses to ignore.** Smartwaiver retries every 5 minutes up to 5 times on any
non-2xx and then cancels that waiver's webhook permanently.

- POST the same `{unique_id, event}` twice → second returns `{ "duplicate": true }`, 200.
- POST an `event` other than `new-waiver` → `{ "ignored": true }`, 200.
- Sign via the plain web URL with an email matching no purchase → the event lands
  with `match_method: "unmatched"`, returns 200, and appears in the admin
  dashboard's unmatched section.
- Omit or corrupt `?k=` → 403. This is the only deliberate rejection.

## Reconciler

```bash
# Dry run first. Prints the exact recipients and reasons, sends nothing.
curl -X POST https://bdkaqgvzjkixwakzploq.supabase.co/functions/v1/waiver-reconcile \
  -H "x-reconcile-token: $RECONCILE_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"mode":"backfill","dryRun":true}'
```

Read the `actions` list and spot-check five names against Stripe before running
with `"dryRun":false`. Backfill ignores the reminder cadence but still honours
the 5-reminder cap and the one-per-day rule, so running it twice cannot spam
anyone. Signature checks use `GET /v4/waivers?external_id=` (100 req/min bucket),
never `/v4/search` (5 req/min).

## Admin dashboard

- Unauthenticated `/admin` must still return 403.
- `INTERNAL_FUNCTION_TOKEN` must never appear in the client bundle — grep
  `dist/assets/*.js` after a build.
- Counts are adults only; minors are covered by a guardian's signature.

## Cleanup

Expire every test Checkout session via the Stripe API when finished, as in
`SKILL.md`. Test attendee rows created by a completed test purchase should be
deleted by hand — nothing prunes them automatically.
