# Earth Song Checkout Testing

Use this skill when testing Earth Song Festival checkout, waiver, Supabase edge functions, Stripe Checkout, or admin dashboard access.

## Devin Secrets Needed

- `EARTHSONG_SUPABASE_ACCESS_TOKEN` — Supabase CLI deploy/config access for project `bdkaqgvzjkixwakzploq`.
- `EARTHSONG_SUPABASE_ANON_KEY` — active project anon key for smoke checks and local builds.
- `EARTHSONG_SUPABASE_SERVICE_ROLE_KEY` — active project service-role key for server-side verification only.
- `EARTHSONG_STRIPE_SECRET_KEY` — used to expire test Stripe Checkout sessions after opening them.
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
3. Click `Reserve Early Bird`.
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

## Stripe Session Cleanup

After opening Stripe Checkout, expire the created session so no smoke checkout remains open:

```bash
python3 - <<'PY'
import json, os, re, urllib.error, urllib.request
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
        headers={'Authorization': 'Bearer ' + os.environ['EARTHSONG_STRIPE_SECRET_KEY']},
        method='POST',
    )
    try:
        with urllib.request.urlopen(req, timeout=20) as res:
            print('expired_status', res.status)
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
