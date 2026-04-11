# Google Sheets + MailerLite Integration Instructions

## Overview

This guide sets up two Supabase Edge Functions that automatically sync event data to external services:

1. **`google-sheets-sync`** — Pushes waiver acceptances and Stripe transactions to a Google Sheet (one tab per data type)
2. **`mailerlite-sync`** — Adds attendees to a MailerLite group/list when they sign the waiver or complete a purchase

Both functions are triggered automatically via Supabase database triggers, so every new row in `waiver_acceptances` and `stripe_orders` gets pushed to both destinations without any manual intervention.

This pattern is proven on the Earth Song Festival website. These instructions reproduce the exact architecture on a new project.

---

## Part 1: Prerequisites — Manual Setup (Do These BEFORE Asking Claude to Code)

You must complete these setup steps in Google Cloud, Google Sheets, and MailerLite **before** running the Claude Code agent instructions. The agent cannot do these steps for you — they require account access.

### A. Google Cloud — Create a Service Account

The edge function uses a Google Service Account to authenticate with the Google Sheets API.

1. Go to **Google Cloud Console** → https://console.cloud.google.com/
2. Create a new project (or use an existing one). Give it a memorable name like "YourEvent-Integrations".
3. In the sidebar, go to **APIs & Services → Library**
4. Search for **"Google Sheets API"** and click **Enable**
5. Go to **APIs & Services → Credentials**
6. Click **Create Credentials → Service Account**
7. Name it something like `sheets-sync-service-account` and click **Create and Continue**
8. Skip the optional role assignment — click **Continue**, then **Done**
9. On the Credentials page, click the newly created service account
10. Go to the **Keys** tab → **Add Key → Create New Key → JSON**
11. A `.json` file will download. **Keep this file safe** — it's your service account credentials.
12. Open the JSON file and copy the `client_email` field value (looks like `sheets-sync-service-account@your-project.iam.gserviceaccount.com`)

### B. Google Sheets — Create the Spreadsheet

1. Go to **Google Sheets** → https://sheets.google.com/
2. Create a new blank spreadsheet. Name it something like "Your Event — Data Sync"
3. Click **Share** in the top right
4. Paste the service account email (from step A.12 above) into the "Add people" field
5. Set permission to **Editor**
6. Uncheck "Notify people" and click **Share**
7. Copy the spreadsheet ID from the URL:
   - URL format: `https://docs.google.com/spreadsheets/d/SPREADSHEET_ID_HERE/edit`
   - Save this ID — you'll need it as an edge function secret

### C. MailerLite — Get API Key and Group ID

1. Go to **MailerLite** → https://app.mailerlite.com/
2. In the sidebar, go to **Integrations → API** (or **Developer API** depending on your plan)
3. Generate a new API token. Name it something like "Supabase Edge Function"
4. Copy the token — you'll need it as an edge function secret (starts with `eyJ...` — it's a JWT)
5. Now create a group (list) for attendees:
   - Go to **Subscribers → Groups**
   - Click **Create group**
   - Name it something like "Event Attendees — 2026" or "Waiver Signers"
6. Get the group ID:
   - Click on the group you just created
   - The URL will contain the group ID: `https://dashboard.mailerlite.com/groups/GROUP_ID_HERE/subscribers`
   - Copy this ID
7. (Optional) Create additional groups if you want to segment by data source:
   - "Ticket Purchasers" (for completed Stripe transactions)
   - "Waiver Signers" (for everyone who signs the waiver, including abandoned checkouts)

### D. Save These Values — You'll Need Them Later

Write down these values before proceeding. You'll paste them into Supabase as Edge Function secrets:

| Value | Where It Came From |
|-------|---------------------|
| Google Service Account JSON (full file contents) | Step A.11 |
| Google Spreadsheet ID | Step B.7 |
| MailerLite API Token | Step C.4 |
| MailerLite Group ID — Waivers | Step C.6 |
| MailerLite Group ID — Purchasers (optional) | Step C.7 |

---

## Part 2: Claude Code Agent Instructions (Save This Section)

The remaining instructions are for a Claude Code agent to implement. Copy everything below this line into your new project's repo as `integration-instructions.md` (or point your agent at this file directly).

---

## Goal

Build two Supabase Edge Functions (`google-sheets-sync` and `mailerlite-sync`) that automatically sync data from Supabase tables to Google Sheets and MailerLite. Triggered by database triggers on `waiver_acceptances` and `stripe_orders`.

## Prerequisites Check

Before writing any code, verify that the following Supabase tables exist:

- `waiver_acceptances` — created by the waiver-checkout-system-instructions.md setup
- `stripe_orders` — created by the Stripe webhook handler (may need to be added if missing)

If `stripe_orders` does not exist, create it first:

```sql
CREATE TABLE IF NOT EXISTS public.stripe_orders (
  id BIGSERIAL PRIMARY KEY,
  checkout_session_id TEXT UNIQUE NOT NULL,
  payment_intent_id TEXT,
  customer_id TEXT,
  customer_email TEXT,
  customer_name TEXT,
  amount_subtotal BIGINT,
  amount_total BIGINT,
  currency TEXT,
  payment_status TEXT,
  status TEXT DEFAULT 'completed',
  ticket_type TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.stripe_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow edge function inserts via service role"
  ON public.stripe_orders
  FOR INSERT
  WITH CHECK (true);
```

Note: `customer_email`, `customer_name`, and `ticket_type` are added here (beyond what the default Stripe webhook usually stores) so the sync functions can populate MailerLite and Google Sheets with human-readable data. Update your `stripe-webhook` edge function to populate these fields from the Stripe Checkout Session metadata.

---

## Step 1: Create the `google-sheets-sync` Edge Function

Create `supabase/functions/google-sheets-sync/index.ts`.

### Responsibilities

1. Receive a POST request from a database trigger containing `{ record, type }`
2. Authenticate with Google Sheets API using a service account JWT
3. Ensure the target tab exists (create it if needed)
4. Ensure the column headers are present (write them if the tab is empty)
5. Append a new row with the record data
6. Return success or detailed error

### Required Secrets

Set these in Supabase Dashboard → Edge Functions → Secrets:

- `GOOGLE_SERVICE_ACCOUNT_KEY` — the full JSON contents of the service account key file (paste the entire JSON, including curly braces, as a single value)
- `GOOGLE_SPREADSHEET_ID` — the spreadsheet ID from the Google Sheets URL

### CORS Headers (required)

```typescript
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};
```

Handle `OPTIONS` requests by returning `new Response(null, { status: 200, headers: corsHeaders })`.

### Google Service Account JWT Authentication

Write a function `getGoogleAccessToken(serviceAccountJson: string)` that:

1. Parses the JSON to get `client_email` and `private_key`
2. Builds a JWT header: `{ alg: "RS256", typ: "JWT" }`
3. Builds a JWT payload:
   ```typescript
   {
     iss: serviceAccount.client_email,
     scope: "https://www.googleapis.com/auth/spreadsheets",
     aud: "https://oauth2.googleapis.com/token",
     exp: now + 3600,
     iat: now,
   }
   ```
4. Base64-URL encodes both header and payload
5. Strips the PEM headers from `private_key` and decodes base64 to get binary key data
6. Imports the key via `crypto.subtle.importKey()` with `RSASSA-PKCS1-v1_5` + `SHA-256`
7. Signs the `header.payload` string with `crypto.subtle.sign()`
8. Base64-URL encodes the signature
9. Constructs the final JWT: `{header}.{payload}.{signature}`
10. POSTs to `https://oauth2.googleapis.com/token` with:
    ```typescript
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    })
    ```
11. Returns the `access_token` from the response

### Sheet Tab Management

Write `ensureSheetTab(accessToken, spreadsheetId, sheetName)`:
- GET `https://sheets.googleapis.com/v4/spreadsheets/{id}?fields=sheets.properties.title`
- Check if `sheetName` is in the list of existing tabs
- If not, POST to `:batchUpdate` with `{ requests: [{ addSheet: { properties: { title: sheetName } } }] }`

Write `ensureHeaders(accessToken, spreadsheetId, sheetName, headers)`:
- GET the first row of the sheet: `values/{sheetName}!A1:{lastCol}1`
- If empty, append the headers as the first row

Write `appendToSheet(accessToken, spreadsheetId, sheetName, values)`:
- POST to `values/{sheetName}!A1:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`
- Body: `{ values: [[...row1], [...row2]] }`

### Row Builders

Define row builders for each data type. The key pattern: each builder takes a record object and returns an array of string values in column order.

```typescript
function buildWaiverRow(record: Record<string, string>): string[] {
  return [
    record.id || "",
    record.attendee_name || "",
    record.attendee_email || "",
    record.attendee_phone || "",
    record.attendee_address || "",
    record.ticket_type || "",
    record.referral_code || "",
    record.waiver_version || "",
    record.created_at || "",
  ];
}

function buildTransactionRow(record: Record<string, string>): string[] {
  return [
    record.id || "",
    record.checkout_session_id || "",
    record.customer_name || "",
    record.customer_email || "",
    record.ticket_type || "",
    record.amount_total ? (Number(record.amount_total) / 100).toFixed(2) : "",
    record.currency || "",
    record.payment_status || "",
    record.status || "",
    record.created_at || "",
  ];
}
```

### Sheet Configuration

```typescript
const SHEET_CONFIG = {
  waiver: {
    name: "Waiver Acceptances",
    headers: ["ID", "Name", "Email", "Phone", "Address", "Ticket Type", "Referral Code", "Waiver Version", "Accepted At"],
    buildRow: buildWaiverRow,
  },
  transaction: {
    name: "Transactions",
    headers: ["ID", "Session ID", "Customer Name", "Customer Email", "Ticket Type", "Amount", "Currency", "Payment Status", "Status", "Created At"],
    buildRow: buildTransactionRow,
  },
};
```

### Main Request Handler

```typescript
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const serviceAccountJson = Deno.env.get("GOOGLE_SERVICE_ACCOUNT_KEY");
    const spreadsheetId = Deno.env.get("GOOGLE_SPREADSHEET_ID");

    if (!serviceAccountJson || !spreadsheetId) {
      return new Response(
        JSON.stringify({ error: "Google Sheets not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { record, type } = await req.json();
    const config = SHEET_CONFIG[type];

    if (!config) {
      return new Response(
        JSON.stringify({ error: `Unknown type: ${type}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const accessToken = await getGoogleAccessToken(serviceAccountJson);
    await ensureSheetTab(accessToken, spreadsheetId, config.name);
    await ensureHeaders(accessToken, spreadsheetId, config.name, config.headers);
    await appendToSheet(accessToken, spreadsheetId, config.name, [config.buildRow(record)]);

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[google-sheets-sync] ERROR:", msg);
    return new Response(
      JSON.stringify({ error: msg }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
```

---

## Step 2: Create the `mailerlite-sync` Edge Function

Create `supabase/functions/mailerlite-sync/index.ts`.

### Responsibilities

1. Receive a POST request from a database trigger containing `{ record, type }`
2. Call the MailerLite API to create or update a subscriber
3. Add the subscriber to the appropriate group based on `type`
4. Return success or detailed error

### Required Secrets

- `MAILERLITE_API_KEY` — from MailerLite Dashboard → Integrations → API
- `MAILERLITE_GROUP_ID_WAIVER` — group ID for waiver signers
- `MAILERLITE_GROUP_ID_PURCHASER` — group ID for completed purchases (optional, can use same group)

### Subscriber API Call

MailerLite's Connect API endpoint: `POST https://connect.mailerlite.com/api/subscribers`

```typescript
async function upsertSubscriber(
  apiKey: string,
  email: string,
  name: string,
  phone: string,
  groupId: string,
  fields: Record<string, string> = {}
): Promise<void> {
  const nameParts = name.trim().split(" ");
  const firstName = nameParts[0] || "";
  const lastName = nameParts.slice(1).join(" ") || "";

  const body = {
    email,
    fields: {
      name: firstName,
      last_name: lastName,
      phone: phone || "",
      ...fields,
    },
    groups: [groupId],
    status: "active",
  };

  const res = await fetch("https://connect.mailerlite.com/api/subscribers", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Accept": "application/json",
      "Authorization": `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`MailerLite API error (${res.status}): ${errText}`);
  }
}
```

### Main Request Handler

```typescript
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get("MAILERLITE_API_KEY");
    const waiverGroupId = Deno.env.get("MAILERLITE_GROUP_ID_WAIVER");
    const purchaserGroupId = Deno.env.get("MAILERLITE_GROUP_ID_PURCHASER") || waiverGroupId;

    if (!apiKey || !waiverGroupId) {
      return new Response(
        JSON.stringify({ error: "MailerLite not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { record, type } = await req.json();

    if (type === "waiver") {
      await upsertSubscriber(
        apiKey,
        record.attendee_email,
        record.attendee_name,
        record.attendee_phone,
        waiverGroupId,
        {
          ticket_type: record.ticket_type || "",
          referral_code: record.referral_code || "",
        }
      );
    } else if (type === "transaction") {
      await upsertSubscriber(
        apiKey,
        record.customer_email,
        record.customer_name,
        "",
        purchaserGroupId,
        {
          ticket_type: record.ticket_type || "",
          amount_paid: record.amount_total ? (Number(record.amount_total) / 100).toFixed(2) : "",
        }
      );
    } else {
      return new Response(
        JSON.stringify({ error: `Unknown type: ${type}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[mailerlite-sync] ERROR:", msg);
    return new Response(
      JSON.stringify({ error: msg }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
```

---

## Step 3: Create Database Triggers

Create a new migration file: `supabase/migrations/YYYYMMDDHHMMSS_add_sync_triggers.sql`

Replace `YOUR_PROJECT_REF` with your actual Supabase project reference (the subdomain in your Supabase URL).

```sql
-- Enable the pg_net extension for HTTP requests from Postgres
CREATE EXTENSION IF NOT EXISTS pg_net;

-- ============================================================================
-- Waiver Acceptances → Google Sheets + MailerLite
-- ============================================================================

CREATE OR REPLACE FUNCTION trigger_waiver_sync()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  payload jsonb;
BEGIN
  payload := jsonb_build_object('record', row_to_json(NEW), 'type', 'waiver');

  -- Google Sheets sync
  PERFORM net.http_post(
    url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/google-sheets-sync',
    headers := jsonb_build_object('Content-Type', 'application/json'),
    body := payload::text
  );

  -- MailerLite sync
  PERFORM net.http_post(
    url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/mailerlite-sync',
    headers := jsonb_build_object('Content-Type', 'application/json'),
    body := payload::text
  );

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Non-blocking: log but don't fail the insert
  RAISE NOTICE 'Sync trigger failed: %', SQLERRM;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_waiver_acceptance_insert ON waiver_acceptances;

CREATE TRIGGER on_waiver_acceptance_insert
  AFTER INSERT ON waiver_acceptances
  FOR EACH ROW
  EXECUTE FUNCTION trigger_waiver_sync();

-- ============================================================================
-- Stripe Orders → Google Sheets + MailerLite
-- ============================================================================

CREATE OR REPLACE FUNCTION trigger_transaction_sync()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  payload jsonb;
BEGIN
  payload := jsonb_build_object('record', row_to_json(NEW), 'type', 'transaction');

  -- Google Sheets sync
  PERFORM net.http_post(
    url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/google-sheets-sync',
    headers := jsonb_build_object('Content-Type', 'application/json'),
    body := payload::text
  );

  -- MailerLite sync
  PERFORM net.http_post(
    url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/mailerlite-sync',
    headers := jsonb_build_object('Content-Type', 'application/json'),
    body := payload::text
  );

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Sync trigger failed: %', SQLERRM;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_stripe_order_insert ON stripe_orders;

CREATE TRIGGER on_stripe_order_insert
  AFTER INSERT ON stripe_orders
  FOR EACH ROW
  EXECUTE FUNCTION trigger_transaction_sync();
```

### Important Notes on the Triggers

- The triggers use `pg_net.http_post()` which fires asynchronously — the database insert will NOT wait for the HTTP call to complete
- The `EXCEPTION WHEN OTHERS` block ensures that if the HTTP call fails (e.g., edge function is down), the original database insert still succeeds
- Both triggers share the same payload structure: `{ record, type }` where `type` distinguishes between `waiver` and `transaction`

---

## Step 4: Deploy the Edge Functions

Set the function configuration to skip JWT verification (since the triggers call from Postgres, not from an authenticated client):

Create `supabase/functions/google-sheets-sync/config.json`:
```json
{
  "verify_jwt": false
}
```

Create `supabase/functions/mailerlite-sync/config.json`:
```json
{
  "verify_jwt": false
}
```

Deploy both functions:

```bash
npx supabase@latest functions deploy google-sheets-sync --project-ref YOUR_PROJECT_REF
npx supabase@latest functions deploy mailerlite-sync --project-ref YOUR_PROJECT_REF
```

---

## Step 5: Set Supabase Edge Function Secrets

In Supabase Dashboard → Edge Functions → Secrets, add:

| Secret Name | Value |
|-------------|-------|
| `GOOGLE_SERVICE_ACCOUNT_KEY` | Full contents of the downloaded service account JSON file |
| `GOOGLE_SPREADSHEET_ID` | The spreadsheet ID from the URL |
| `MAILERLITE_API_KEY` | Your MailerLite API token |
| `MAILERLITE_GROUP_ID_WAIVER` | Group ID for waiver signers |
| `MAILERLITE_GROUP_ID_PURCHASER` | Group ID for completed purchases (optional) |

---

## Step 6: Run the Migration

Apply the database migration to create the triggers:

```bash
npx supabase@latest db push --project-ref YOUR_PROJECT_REF
```

Or run the SQL directly in Supabase Dashboard → SQL Editor.

---

## Step 7: Test the Integration

### Test the Waiver Sync

1. Go to your site and fill out the waiver form with test data
2. Click "Proceed to Payment" to trigger a waiver insert
3. Check the Google Sheet — a new row should appear in the "Waiver Acceptances" tab
4. Check MailerLite → Subscribers → your Waivers group — the test email should appear there

### Test the Transaction Sync

1. Complete a test purchase using a Stripe test card (`4242 4242 4242 4242`)
2. After payment, the Stripe webhook should insert a row into `stripe_orders`
3. Check the Google Sheet — a new row should appear in the "Transactions" tab
4. Check MailerLite → Subscribers → your Purchasers group — the buyer should appear there

### Debug via Edge Function Logs

If anything doesn't work:

1. Supabase Dashboard → Edge Functions → `google-sheets-sync` → **Logs**
2. Supabase Dashboard → Edge Functions → `mailerlite-sync` → **Logs**
3. Look for error messages prefixed with `[google-sheets-sync] ERROR:` or `[mailerlite-sync] ERROR:`

Common issues:
- **403 Forbidden from Google**: The service account email was not added to the sheet with Editor permission
- **401 Unauthorized from MailerLite**: API key is wrong or missing the `Bearer ` prefix
- **Unknown group ID**: The group ID format is wrong (MailerLite IDs are long numeric strings)
- **Trigger not firing**: `pg_net` extension is not enabled, or the trigger was not created successfully

---

## File Structure Summary

```
supabase/
  functions/
    google-sheets-sync/
      index.ts              ← Google Sheets sync function
      config.json           ← { "verify_jwt": false }
    mailerlite-sync/
      index.ts              ← MailerLite sync function
      config.json           ← { "verify_jwt": false }
  migrations/
    YYYYMMDDHHMMSS_add_sync_triggers.sql   ← Database triggers
```

---

## Customization Checklist

- [ ] Replace `YOUR_PROJECT_REF` in the migration SQL with your actual Supabase project ref
- [ ] Set all 5 Edge Function secrets in Supabase Dashboard
- [ ] Verify the `stripe_orders` table has `customer_email`, `customer_name`, and `ticket_type` columns
- [ ] Update `stripe-webhook` edge function to populate those fields from Stripe Checkout Session metadata
- [ ] Customize sheet tab names if you want different labels
- [ ] Customize column order and row builders to match your data model
- [ ] Create separate MailerLite groups if you want to segment waiver signers vs purchasers
- [ ] Test with real data before going live

---

## Common Pitfalls

1. **Forgot to share the Google Sheet with the service account**: Returns 403 Forbidden. Always share the sheet with the service account email (not your personal email) with Editor permission.

2. **Pasted the service account JSON wrong**: The entire JSON must be pasted as a single value in the Supabase secret, including curly braces and newlines. Do not wrap it in quotes or escape anything.

3. **`pg_net` extension not enabled**: The trigger will silently fail. Run `CREATE EXTENSION IF NOT EXISTS pg_net;` first.

4. **Edge functions require JWT by default**: Must set `verify_jwt: false` in config.json, otherwise the triggers (which don't send auth headers) will get 401 errors.

5. **Triggers block the INSERT**: If you don't wrap the HTTP calls in `EXCEPTION WHEN OTHERS`, a failed sync can block the waiver or transaction from being saved. Always include error handling.

6. **MailerLite rate limits**: The Connect API allows 120 requests/minute. For high-volume events, consider batching or queueing.

7. **Duplicate subscribers**: MailerLite treats duplicate emails as updates (not errors) when you POST to `/subscribers`. This is the desired behavior — a user who signs the waiver AND completes a purchase will get their fields updated, not duplicated.
