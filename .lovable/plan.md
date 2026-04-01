

# Plan: Enable Klarna/Afterpay BNPL + Fix Build Errors

## Problem
1. The user wants Klarna/Afterpay BNPL enabled at checkout (2 small code changes).
2. There are existing build errors in `WaiverDialog.tsx` because the generated `types.ts` has no tables defined (all `[_ in never]: never`), so querying `"referral_codes"` fails at the type level.

## Changes

### 1. Fix build error in WaiverDialog.tsx
The Supabase types file shows no tables, causing the `supabase.from("referral_codes")` call to fail type-checking. Will add a type assertion (`as any`) on the `.from()` call to bypass the generated types, matching the pattern already used in other files (AdminDashboard, PaymentSuccess, SignWaiver).

**File:** `src/components/WaiverDialog.tsx` (~line 73)

### 2. Add BNPL config to create-checkout edge function
Add two keys to `sessionParams`:
- `payment_method_configuration: "pmc_1THRrA9YdWVK7v3DXseZCFL2"`
- `automatic_payment_methods: { enabled: true }`

**File:** `supabase/functions/create-checkout/index.ts` (~line 125, after `mode: "payment"`)

### 3. Add installment copy below ticket CTA button
Add one `<p>` tag after the `<Button>` in TicketsSection.tsx (~line 157):
```
<p className="text-sm text-center mt-2 opacity-70">
  Pay in installments available at checkout via Klarna or Afterpay
</p>
```

**File:** `src/components/TicketsSection.tsx`

## What stays untouched
- All other edge functions, migrations, types.ts, App.tsx, waiver modal logic, waiver insert block, Early Bird expiry check.

