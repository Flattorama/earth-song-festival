# Waiver-Gated Checkout System — Claude Code Agent Instructions

## Overview

Build a waiver-gated checkout system where users **must read and accept a liability waiver before they can proceed to Stripe payment**. The waiver appears as a modal dialog when the user clicks any ticket purchase button. The waiver acceptance is recorded in a Supabase database table before the Stripe Checkout session is created, ensuring a legal record exists even if payment is later abandoned.

This pattern was proven in production on the Earth Song Festival website (earthsongfestival.com). These instructions reproduce the exact same architecture for a new event site.

---

## Architecture Summary

```
User clicks "Buy Ticket"
        ↓
  WaiverDialog opens (modal)
        ↓
  User scrolls through waiver text
  User fills in: Name*, Email*, Phone, Address
  User checks "I agree" checkbox
        ↓
  User clicks "Proceed to Payment"
        ↓
  Frontend POSTs to Supabase Edge Function (create-checkout)
        ↓
  Edge function inserts waiver_acceptances row (BEFORE payment)
        ↓
  Edge function creates Stripe Checkout Session
        ↓
  User is redirected to Stripe's hosted checkout page
        ↓
  After payment, user returns to /payment-success
```

---

## Tech Stack Requirements

- **Frontend:** React + TypeScript (Vite recommended)
- **UI Components:** shadcn/ui (Dialog, Input, Label, Checkbox, Button)
- **Toast Notifications:** Sonner
- **Icons:** Lucide React
- **Backend:** Supabase (PostgreSQL + Edge Functions)
- **Payments:** Stripe (Checkout Sessions, hosted mode)

If the target project already uses shadcn/ui, no additional component installation is needed. If not, install these shadcn/ui components first: `dialog`, `input`, `label`, `checkbox`, `button`.

---

## Step 1: Create the Supabase Database Table

Run this SQL migration in the Supabase SQL Editor (or create a migration file):

```sql
CREATE TABLE public.waiver_acceptances (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  attendee_name TEXT NOT NULL,
  attendee_email TEXT NOT NULL,
  attendee_phone TEXT DEFAULT '',
  attendee_address TEXT DEFAULT '',
  ticket_type TEXT NOT NULL,
  waiver_version TEXT NOT NULL,
  referral_code TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.waiver_acceptances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow edge function inserts via service role"
  ON public.waiver_acceptances
  FOR INSERT
  WITH CHECK (true);
```

### Column explanations:
- `attendee_name` / `attendee_email`: Required fields collected in the waiver dialog
- `attendee_phone` / `attendee_address`: Optional fields
- `ticket_type`: String identifier for the ticket (e.g., "general-admission", "vip")
- `waiver_version`: Version string for legal tracking (e.g., "v1.0_2026-08-07"). Update this whenever the waiver text changes so you can tell which version each attendee signed.
- `referral_code`: Optional referral/promo code tracking (can be removed if not needed)

### Important notes:
- RLS is enabled with a permissive INSERT policy because the edge function uses the **service role key** which bypasses RLS. The policy exists as a safety net.
- The `waiver_version` column is critical for legal compliance. If you ever update the waiver text, increment the version string.

---

## Step 2: Create the Waiver Content Component

Create `src/components/WaiverContent.tsx`. This component contains the full legal waiver text and optional per-section acknowledgement checkboxes.

### Structure:

```tsx
interface WaiverContentProps {
  section1Checked?: boolean;
  onSection1Change?: (checked: boolean) => void;
  section2Checked?: boolean;
  onSection2Change?: (checked: boolean) => void;
  showCheckboxes?: boolean;
}
```

### Key design elements:

1. **Clickable title** that links to a downloadable PDF version of the waiver (place the PDF in the `/public` folder)
2. **Warning header** in an amber/yellow callout box with uppercase text: "WARNING: BY SIGNING THIS DOCUMENT YOU WILL WAIVE CERTAIN LEGAL RIGHTS..."
3. **Numbered sections** for each legal clause (Acknowledgement of Risk, Release of Liability, Indemnity, Medical Responsibility, Media Release, General Provisions, Full Understanding, Data Privacy)
4. **Per-section checkboxes** after critical sections (e.g., after "Acknowledgement of Risk" and "Release of Liability") styled as highlighted callout rows with a muted background
5. **Schedule/Appendix** for property rules or event-specific rules at the bottom

### Styling conventions:
- Section headings: `font-serif text-base font-semibold text-primary`
- Body text: `text-sm text-foreground/80 leading-relaxed`
- Checkbox callouts: `bg-muted/50 rounded-lg p-3 border border-border`
- Warning box: `bg-amber-50 border border-amber-200 rounded-lg p-4`

**IMPORTANT:** Replace all waiver text with the actual legal text for your specific event. The waiver content is event-specific and must be reviewed by a legal professional. Do NOT copy the Earth Song Festival waiver text verbatim — it references specific entities, locations, and Ontario law.

---

## Step 3: Create the Waiver Dialog Component

Create `src/components/WaiverDialog.tsx`. This is the main modal that wraps the waiver content, attendee information form, and checkout trigger.

### Props interface:

```tsx
interface WaiverDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ticketType: string;
  ticketLabel: string;
}
```

### Component structure (top to bottom inside the Dialog):

1. **Sticky header** (pinned to top of modal):
   - Title: "Liability Waiver Agreement"
   - Description: "Please read the waiver below, fill in your information, and accept before proceeding to purchase your **{ticketLabel}** ticket."

2. **Scrollable waiver body** (middle section):
   - Contains `<WaiverContent>` with section checkboxes enabled
   - Has a `ref` for scroll tracking and a `maxHeight: 400px` style
   - Bottom fade gradient (sticky, `bg-gradient-to-t from-background to-transparent`) that disappears once user scrolls near the bottom
   - "Scroll to read full agreement" pill button (centered, disappears when user reaches bottom)

3. **Fixed bottom section** (below the scroll area, with `border-t`):
   - "Attendee Information" heading
   - Form fields in a 2-column grid (`grid-cols-1 sm:grid-cols-2`):
     - **Full Name** (required, marked with red asterisk)
     - **Email** (required, marked with red asterisk)
     - **Phone** (optional)
     - **Address** (optional)
   - **Referral Code** field (optional — remove if you don't need referral tracking)
   - **"I agree" checkbox** with full legal acknowledgement text
   - **"Proceed to Payment" button** (full-width, disabled until name + email + checkbox are filled)

### State management:

```tsx
const [name, setName] = useState("");
const [email, setEmail] = useState("");
const [phone, setPhone] = useState("");
const [address, setAddress] = useState("");
const [agreed, setAgreed] = useState(false);
const [section1Checked, setSection1Checked] = useState(false);
const [section2Checked, setSection2Checked] = useState(false);
const [loading, setLoading] = useState(false);
const [showScrollHint, setShowScrollHint] = useState(true);
```

### Scroll detection logic:

```tsx
const handleScroll = useCallback(() => {
  const el = scrollRef.current;
  if (!el) return;
  const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 100;
  if (nearBottom) setShowScrollHint(false);
}, []);
```

### Submit validation:

```tsx
const canSubmit = name.trim() !== "" && email.trim() !== "" && agreed;
```

### Checkout trigger (handleProceed):

When the user clicks "Proceed to Payment":

1. POST to the `create-checkout` edge function URL with headers:
   - `Content-Type: application/json`
   - `Authorization: Bearer {SUPABASE_ANON_KEY}`
   - `apikey: {SUPABASE_ANON_KEY}`
2. Body: `{ ticketType, customerEmail, customerName, customerPhone, customerAddress, referralCode }`
3. On success: `window.location.href = result.url` (redirects to Stripe)
4. On error: show a toast with `toast.error("Unable to start checkout: {message}")`

### Form reset:
When the dialog closes, reset all form fields and state back to defaults.

### Styling:
- Dialog: `max-w-2xl max-h-[90vh] overflow-hidden p-0 gap-0 flex flex-col`
- Sticky header: `sticky top-0 z-10 bg-background px-6 pt-6 pb-4 border-b`
- Scroll area: `flex-1 overflow-y-auto overscroll-contain px-6 pt-4 pb-2`
- Bottom form section: `border-t border-border px-6 py-5 space-y-4 flex-shrink-0`
- Proceed button: `w-full h-12 rounded-lg text-base bg-primary text-primary-foreground`

---

## Step 4: Create the Supabase Edge Function

Create `supabase/functions/create-checkout/index.ts`. This Deno edge function:

1. Receives the POST request from the frontend
2. Validates the ticket type
3. Inserts a `waiver_acceptances` row (BEFORE creating the Stripe session)
4. Creates a Stripe Checkout Session
5. Returns the checkout URL

### Key implementation details:

```typescript
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
```

### CORS headers (required for cross-origin requests from your frontend):

```typescript
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};
```

The function MUST handle `OPTIONS` requests by returning an empty response with CORS headers.

### Ticket configuration:

Define a `TICKETS` object mapping ticket type slugs to `{ name, description, amount }`. The `amount` is in **cents** (e.g., 29900 = $299.00).

```typescript
const TICKETS: Record<string, { name: string; description: string; amount: number }> = {
  "general-admission": {
    name: "Event Name — General Admission",
    description: "Description of what's included",
    amount: 10000, // $100.00
  },
  // Add more ticket types as needed
};
```

### Waiver insert (happens BEFORE Stripe):

```typescript
const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

const { error: insertError } = await supabase
  .from("waiver_acceptances")
  .insert({
    attendee_name: (customerName || "").trim(),
    attendee_email: (customerEmail || "").trim(),
    attendee_phone: (customerPhone || "").trim(),
    attendee_address: (customerAddress || "").trim(),
    ticket_type: ticketType,
    waiver_version: "v1.0_YOUR-EVENT-DATE",
    referral_code: referralCode || null,
  });

if (insertError) {
  console.error("[create-checkout] Waiver insert error:", insertError);
  return new Response(
    JSON.stringify({ error: "Failed to save waiver acceptance" }),
    { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}
```

### Stripe Checkout Session creation:

```typescript
const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY"));
const origin = req.headers.get("origin") || "https://your-domain.com";

const sessionParams: Record<string, unknown> = {
  line_items: [{
    price_data: {
      currency: "cad",  // Change to your currency
      product_data: {
        name: ticket.name,
        description: ticket.description,
      },
      unit_amount: ticket.amount,
    },
    quantity: 1,
  }],
  mode: "payment",
  success_url: `${origin}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
  cancel_url: `${origin}/#tickets`,
  metadata: {
    ticket_type: ticketType,
    attendee_name: customerName || "",
  },
};

if (customerEmail) {
  sessionParams.customer_email = customerEmail;
}

const session = await stripe.checkout.sessions.create(sessionParams);
return new Response(JSON.stringify({ url: session.url }), {
  headers: { ...corsHeaders, "Content-Type": "application/json" },
  status: 200,
});
```

### Required Supabase Edge Function secrets:

Set these in Supabase Dashboard → Edge Functions → Secrets:
- `STRIPE_SECRET_KEY` — your Stripe secret key (starts with `sk_test_` or `sk_live_`)
- `SUPABASE_URL` — auto-provided by Supabase
- `SUPABASE_SERVICE_ROLE_KEY` — auto-provided by Supabase

---

## Step 5: Wire Up the Tickets Section

In whatever component renders your ticket cards, add state to track the waiver dialog:

```tsx
const [waiverOpen, setWaiverOpen] = useState(false);
const [selectedTicket, setSelectedTicket] = useState<{
  type: string;
  label: string;
} | null>(null);

const handleTicketClick = (ticketType: string, ticketLabel: string) => {
  setSelectedTicket({ type: ticketType, label: ticketLabel });
  setWaiverOpen(true);
};
```

Each ticket's purchase button calls `handleTicketClick(tier.ticketType, tier.name)`.

Render the WaiverDialog at the bottom of the section:

```tsx
{selectedTicket && (
  <WaiverDialog
    open={waiverOpen}
    onOpenChange={setWaiverOpen}
    ticketType={selectedTicket.type}
    ticketLabel={selectedTicket.label}
  />
)}
```

---

## Step 6: Configure Frontend Constants

In `WaiverDialog.tsx`, set these two constants to match your Supabase project:

```typescript
const CHECKOUT_URL = "https://YOUR-PROJECT-REF.supabase.co/functions/v1/create-checkout";
const ANON_KEY = "YOUR_SUPABASE_ANON_KEY";
```

Get these values from: Supabase Dashboard → Settings → API → Project URL and `anon` `public` key.

---

## Step 7: Deploy the Edge Function

From your project root, deploy with:

```bash
npx supabase@latest functions deploy create-checkout --project-ref YOUR-PROJECT-REF
```

Or if using the Supabase CLI globally:

```bash
supabase functions deploy create-checkout
```

---

## Step 8: Stripe Webhook Handler (Optional but Recommended)

For tracking completed payments, create `supabase/functions/stripe-webhook/index.ts` that:

1. Verifies the Stripe webhook signature
2. Listens for `checkout.session.completed` events
3. Inserts a record into a `stripe_orders` table

This requires an additional secret: `STRIPE_WEBHOOK_SECRET` (found in Stripe Dashboard → Developers → Webhooks).

You also need to register the webhook URL in Stripe Dashboard:
- URL: `https://YOUR-PROJECT-REF.supabase.co/functions/v1/stripe-webhook`
- Events: `checkout.session.completed`

---

## Customization Checklist

Before deploying, customize these items for your specific event:

- [ ] Replace all waiver legal text in `WaiverContent.tsx` with your event's actual waiver (reviewed by a legal professional)
- [ ] Update the waiver title, event name, dates, and location
- [ ] Update `waiver_version` string in the edge function to match your event
- [ ] Update the `TICKETS` object in the edge function with your ticket types, names, descriptions, and prices
- [ ] Update `currency` if not using CAD
- [ ] Set `CHECKOUT_URL` and `ANON_KEY` in `WaiverDialog.tsx` to your Supabase project values
- [ ] Set `STRIPE_SECRET_KEY` in Supabase Edge Function secrets
- [ ] Update `success_url` and `cancel_url` fallback domains
- [ ] Place a downloadable PDF of the waiver in the `/public` folder and update the link in `WaiverContent.tsx`
- [ ] Remove the referral code field and logic if not needed
- [ ] Add or remove form fields (phone, address) as needed
- [ ] Style the components to match your site's design system (colors, fonts, spacing)

---

## File Structure Summary

```
src/
  components/
    WaiverContent.tsx       ← Legal waiver text + per-section checkboxes
    WaiverDialog.tsx         ← Modal dialog wrapping waiver + form + checkout trigger
    TicketsSection.tsx       ← Ticket cards that open the waiver dialog
  integrations/
    supabase/
      client.ts              ← Supabase client initialization (for referral code validation)

supabase/
  functions/
    create-checkout/
      index.ts               ← Edge function: waiver insert + Stripe session creation
    stripe-webhook/
      index.ts               ← Edge function: payment confirmation handler (optional)
  migrations/
    YYYYMMDD_create_waiver_acceptances.sql  ← Database migration

public/
  Your_Event_Waiver_Printable.pdf  ← Downloadable PDF of the waiver
```

---

## Common Pitfalls

1. **CORS errors**: The edge function MUST handle `OPTIONS` requests and return CORS headers on ALL responses (success and error). Missing CORS headers on error responses will show as "Failed to fetch" in the browser.

2. **Supabase database paused**: Free-tier Supabase projects pause after 1 week of inactivity. This causes "Failed to save waiver acceptance" errors. Monitor your project status or upgrade to Pro.

3. **Stripe parameter conflicts**: If enabling BNPL payment methods (Klarna/Afterpay), use ONLY `payment_method_configuration: "pmc_XXXX"` in the session params. Do NOT also add `automatic_payment_methods: { enabled: true }` — these are mutually exclusive and Stripe will reject the request.

4. **Waiver insert before payment**: The waiver acceptance is intentionally recorded BEFORE the Stripe session is created. This ensures a legal record exists even if the user abandons checkout. This is by design.

5. **RLS and service role**: The edge function uses `SUPABASE_SERVICE_ROLE_KEY` which bypasses Row Level Security. This is correct — the edge function needs to insert rows without user authentication.

6. **Form reset on close**: Always reset all form fields when the dialog closes, so returning users see a clean form.
