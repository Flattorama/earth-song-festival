# Earth Song Checkout Testing

Use this skill when testing Earth Song Festival checkout, waiver, Supabase edge functions, Stripe Checkout, or admin dashboard access.

## Devin Secrets Needed

- `EARTHSONG_SUPABASE_ACCESS_TOKEN` — Supabase CLI deploy/config access for project `bdkaqgvzjkixwakzploq`.
- `EARTHSONG_SUPABASE_ANON_KEY` — active project anon key for smoke checks and local builds.
- `EARTHSONG_SUPABASE_SERVICE_ROLE_KEY` — active project service-role key for server-side verification only.
- `EARTHSONG_STRIPE_SECRET_KEY` — used to inspect/expire test Stripe Checkout sessions after opening them.
- `EARTHSONG_STRIPE_WEBHOOK_SECRET` — needed when testing signed webhook handling.
- `ADMIN_DASHBOARD_TOKEN` — required to verify authenticated `/admin` data loading.
- `EARTHSONG_GOOGLE_SERVICE_ACCOUNT_KEY` and `EARTHSONG_GOOGLE_SPREADSHEET_ID` — needed for Google Sheets sync verification.
- `EARTHSONG_MAILERLITE_API_KEY` and MailerLite group IDs — only needed for MailerLite sync/webhook testing.

Never print secret values. It is okay to decode public JWT claims to compare project refs, but do not log raw tokens.

## Project Commands

Run from the repo root:

```bash
npm ci
npm run lint
npm run build
npm test
```

`npm run lint` may pass with existing Fast Refresh warnings in UI component files.

## Live Checkout UI Test

1. Open `https://earthsongfestival.com/?checkout-test=<timestamp>`.
2. Click `Buy Tickets` in the top navigation.
3. Click the relevant adult ticket CTA.
4. In the `Liability Waiver Agreement` modal, fill:
   - Full Name: `Devin Checkout Tester`
   - Email: `devin-checkout-<timestamp>@example.com`
   - Leave optional fields blank unless the scenario requires them.
5. Check the final agreement checkbox.
6. Assert `Proceed to Payment` becomes enabled.
7. Click `Proceed to Payment`.
8. Assert the browser redirects to `https://checkout.stripe.com/c/pay/...`.
9. Stop before entering payment details.

If the flow fails, record the exact toast text. Common edge-function failures include `Failed to send a request to the Edge Function` and `Edge Function returned a non-2xx status code`.

## Linked Youth Checkout UI Test

Use this when verifying adult tickets linked with paid/free youth tickets and minor waiver records.

1. Start from an adult ticket card, not a standalone youth route. Youth tickets should be added inside the adult waiver modal.
2. Fill adult name/email and add youth attendees from the `Youth / Minor Tickets` section.
3. Cover at least one paid youth and one free under-2 youth in the same checkout:
   - Paid youth example: Full Weekend, Ages 13–18, amount `15000` cents.
   - Free youth example: Full Weekend, Under 2, amount `0` cents.
4. Assert `Proceed to Payment` remains disabled until all youth names, DOBs, guardian initials, adult agreement, and minor agreement are complete.
5. Assert the visible modal shows both youth attendees, both DOBs, paid-youth subtotal, and the under-2 youth as free before submission.
6. Click `Proceed to Payment` and stop after Stripe Checkout opens.
7. Use the Stripe line-items API to verify only paid tickets are in Stripe: adult ticket plus paid youth line items. Free under-2 minors should not be Stripe line items.
8. Query local/target Supabase `minor_waiver_acceptances` for the test email and verify each minor row stores name, DOB, pass type, age band, amount, and a shared non-empty `stripe_session_id`.
9. Verify authenticated `/admin` shows the `Minor Waivers` count and rows for each youth attendee.
10. Verify unauthenticated admin access still returns HTTP `403` with `{"error":"Unauthorized"}`.
11. Expire the created Stripe Checkout Session.

Chrome/Linux date inputs may not reliably accept typed `YYYY-MM-DD` values through desktop automation. If needed, set DOB fields through the browser CDP automation channel, but only count the test as passed if the visible modal shows the expected dates before submit and the database stores those exact values after checkout creation.

## Targeted Live Paid-Youth Stripe Retest

Use this narrower path when the specific production risk is that the UI accepts youth add-ons but Stripe Checkout drops the paid youth line item.

1. Open `https://earthsongfestival.com/?live-youth-stripe-retest=<timestamp>#tickets`.
2. Buy Regular Admission and add one Full Weekend youth with age band `Ages 13–18`.
3. Verify the modal displays `Full Weekend Pass — Ages 13–18: CA$150` and `Youth ticket subtotal: CA$150`.
4. Before filling all youth fields, verify `Proceed to Payment` is disabled.
5. Fill minor name, DOB, guardian initials, the minor guardian agreement, and the adult waiver agreement.
6. Click `Proceed to Payment` and stop at Stripe Checkout.
7. Extract the session ID from the Checkout URL with `/pay/(cs_(?:live|test)_[^#?]+)`.
8. Use the Stripe line-items API. Expected line items for Regular Admission + Full Weekend 13–18 youth:
   - `Earth Song — Regular Admission (Adult + babies in arms)`, `33300` CAD, quantity `1`.
   - `Earth Song — Full Weekend Youth Pass — Ages 13–18`, `15000` CAD, quantity `1`.
   - Total `48300` cents.
9. Query `minor_waiver_acceptances` for the test email and verify exactly one row with `youth_ticket_amount = 15000` and `stripe_session_id` matching the Stripe session.
10. Expire the Stripe session.

This targeted retest does not replace the broader linked-youth regression test with paid + free youth; it is useful for quickly proving the live backend no longer drops paid youth line items.

## Stripe Session Inspection

After opening Stripe Checkout, inspect line items without entering payment details:

```bash
python3 - <<'PY'
import base64, json, os, urllib.request
session_id = 'cs_live_or_test_id_here'
req = urllib.request.Request(
    f'https://api.stripe.com/v1/checkout/sessions/{session_id}/line_items?limit=10',
    headers={'Authorization': 'Basic ' + base64.b64encode((os.environ['EARTHSONG_STRIPE_SECRET_KEY'] + ':').encode()).decode()},
)
with urllib.request.urlopen(req, timeout=20) as res:
    data = json.load(res)
print(json.dumps([
    {
      'description': item.get('description'),
      'currency': item.get('currency'),
      'amount_subtotal': item.get('amount_subtotal'),
      'amount_total': item.get('amount_total'),
      'quantity': item.get('quantity')
    }
    for item in data.get('data', [])
], indent=2))
PY
```

## Supabase Minor Waiver Verification

Use REST with the service role key to verify test rows without printing secret values:

```bash
python3 - <<'PY'
import json, os, urllib.parse, urllib.request
project = 'bdkaqgvzjkixwakzploq'
email = 'devin-checkout-<timestamp>@example.com'
key = os.environ['EARTHSONG_SUPABASE_SERVICE_ROLE_KEY']
params = urllib.parse.urlencode({
    'guardian_email': f'eq.{email}',
    'select': 'guardian_email,minor_name,minor_date_of_birth,youth_pass_type,youth_age_band,youth_ticket_label,youth_ticket_amount,stripe_session_id,accepted_at',
})
req = urllib.request.Request(
    f'https://{project}.supabase.co/rest/v1/minor_waiver_acceptances?{params}',
    headers={'apikey': key, 'Authorization': f'Bearer {key}'},
)
with urllib.request.urlopen(req, timeout=20) as res:
    print(json.dumps(json.load(res), indent=2))
PY
```

## Stripe Session Cleanup

After opening Stripe Checkout, expire the created session so no smoke checkout remains open:

```bash
python3 - <<'PY'
import base64, json, os, re, urllib.error, urllib.request
# Read Chrome's active tab list and find the Stripe Checkout URL.
tabs = json.load(urllib.request.urlopen('http://localhost:29229/json', timeout=5))
for tab in tabs:
    url = tab.get('url', '')
    match = re.search(r'/pay/(cs_(?:live|test)_[^#?]+)', url)
    if not match:
        continue
    session_id = match.group(1)
    req = urllib.request.Request(
        f'https://api.stripe.com/v1/checkout/sessions/{session_id}/expire',
        data=b'',
        headers={'Authorization': 'Basic ' + base64.b64encode((os.environ['EARTHSONG_STRIPE_SECRET_KEY'] + ':').encode()).decode()},
        method='POST',
    )
    try:
        with urllib.request.urlopen(req, timeout=20) as res:
            data = json.load(res)
            print('expired_status', res.status, data.get('status'), data.get('payment_status'))
    except urllib.error.HTTPError as exc:
        print('expire_status', exc.code)
PY
```

## Admin Safety Check

When changing edge-function JWT settings, verify the admin endpoint remains protected by app-level token auth:

```bash
python3 - <<'PY'
import urllib.error, urllib.request
req = urllib.request.Request(
    'https://bdkaqgvzjkixwakzploq.supabase.co/functions/v1/get-admin-dashboard-data',
    data=b'{}',
    headers={'Origin': 'https://earthsongfestival.com', 'Content-Type': 'application/json'},
    method='POST',
)
try:
    with urllib.request.urlopen(req, timeout=20) as res:
        print('admin_unauth_status', res.status)
except urllib.error.HTTPError as exc:
    print('admin_unauth_status', exc.code)
    print(exc.read().decode()[:120])
PY
```

Expected unauthenticated result: `admin_unauth_status 403` and `{"error":"Unauthorized"}`.

## Supabase Backend Drift Diagnostics

If the live UI shows current youth controls but Stripe Checkout omits youth line items, suspect Supabase backend drift rather than a frontend cache issue.

1. Verify the deployed frontend bundle points at `https://bdkaqgvzjkixwakzploq.supabase.co` using the live bundle diagnostics below.
2. Query `minor_waiver_acceptances` through REST with the service role key. A missing table or `404` means migrations are not applied remotely.
3. Create a stop-at-Stripe session through the live UI and inspect line items via Stripe API. If the Supabase row exists but Stripe has only the adult line item, the deployed `create-checkout` function might be stale.
4. After repairing/deploying, repeat the UI flow and Stripe API check; visual Checkout inspection alone is not sufficient.
5. Expire every diagnostic Checkout session.

## Supabase Edge Function Deployment Notes

The active Supabase project ref is `bdkaqgvzjkixwakzploq`.

Use `npx supabase@latest` if the `supabase` binary is unavailable:

```bash
export SUPABASE_ACCESS_TOKEN="$EARTHSONG_SUPABASE_ACCESS_TOKEN"
npx supabase@latest functions deploy create-checkout --project-ref bdkaqgvzjkixwakzploq --no-verify-jwt
```

Buyer-facing public functions invoked directly from the browser may need `verify_jwt=false` so checkout does not depend on the deployed frontend anon JWT matching the active project. Keep sensitive data protected inside function code with unguessable IDs/tokens or explicit app-level auth such as `X-Admin-Token`.

## Live Bundle Diagnostics

To confirm the deployed bundle's Supabase project URL and public JWT project ref without printing token values:

```bash
python3 - <<'PY'
import base64, json, re, time, urllib.request
html = urllib.request.urlopen('https://earthsongfestival.com/?inspect=' + str(int(time.time())), timeout=20).read().decode()
asset = re.findall(r'src="([^"]+\.js)"', html)[0]
js = urllib.request.urlopen('https://earthsongfestival.com' + asset, timeout=20).read().decode(errors='ignore')
print('active_url_present', 'https://bdkaqgvzjkixwakzploq.supabase.co' in js)
for token in re.findall(r'eyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+', js):
    payload = token.split('.')[1]
    payload += '=' * ((4 - len(payload) % 4) % 4)
    claims = json.loads(base64.urlsafe_b64decode(payload))
    print({key: claims.get(key) for key in ['iss', 'ref', 'role', 'iat', 'exp']})
    break
PY
```

Expected active project ref: `bdkaqgvzjkixwakzploq`.
