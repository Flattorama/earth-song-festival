/*
  # Track the emailed-Smartwaiver lifecycle

  The in-checkout waiver modal is being retired. Buyers now receive a Smartwaiver
  link by email after payment, sign it on Smartwaiver, and a webhook reports back.
  This adds the columns that lifecycle needs on `attendees`, plus a raw audit log
  of every webhook Smartwaiver sends us.

  `waiver_acceptances` and `minor_waiver_acceptances` are deliberately left alone.
  They hold the real legal records for everyone who bought under the old flow and
  their Google Sheets sync triggers keep working; they simply stop receiving rows.

  ## One-time manual setup BEFORE the new flow works
  1. Set the edge-function secrets (Dashboard -> Edge Functions -> Secrets):
       SMARTWAIVER_API_KEY, SMARTWAIVER_TEMPLATE_ID, SMARTWAIVER_WEBHOOK_SECRET,
       WAIVER_EMAIL_FROM, INTERNAL_FUNCTION_TOKEN, CHECKIN_TOKEN,
       FESTIVAL_START_DATE
     (RESEND_API_KEY and ALERT_EMAIL_FROM already exist for sync-reconcile —
     confirm they are genuinely set, that function treats them as optional.)
  2. Register the account-level Smartwaiver webhook, including the shared secret:
       https://bdkaqgvzjkixwakzploq.supabase.co/functions/v1/smartwaiver-webhook?k=<SMARTWAIVER_WEBHOOK_SECRET>

  Additive only: every statement is IF NOT EXISTS. No data is modified.
*/

-- Lifecycle of the emailed waiver, tracked per attendee.
ALTER TABLE public.attendees
  ADD COLUMN IF NOT EXISTS smartwaiver_id          TEXT,
  ADD COLUMN IF NOT EXISTS smartwaiver_url         TEXT,
  ADD COLUMN IF NOT EXISTS waiver_email_sent_at    TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS waiver_reminder_count   INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS waiver_last_reminder_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS checked_in_at           TIMESTAMP WITH TIME ZONE,
  -- Minors added to a guardian's Smartwaiver become their own attendee rows.
  -- Without this flag the registration desk cannot tell "3 adults expected,
  -- 1 signed" from "1 adult + 2 kids, all accounted for".
  ADD COLUMN IF NOT EXISTS is_minor                BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_attendees_waiver_status
  ON public.attendees (waiver_status);
CREATE INDEX IF NOT EXISTS idx_attendees_smartwaiver_id
  ON public.attendees (smartwaiver_id);
CREATE INDEX IF NOT EXISTS idx_attendees_email_lower
  ON public.attendees (lower(email));

-- Raw audit log of every Smartwaiver webhook, so a mis-parse is never data loss.
CREATE TABLE IF NOT EXISTS public.smartwaiver_events (
  id                  UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  unique_id           TEXT NOT NULL,
  event               TEXT NOT NULL,
  raw_payload         JSONB NOT NULL DEFAULT '{}'::jsonb,
  waiver_data         JSONB,
  matched_attendee_id UUID REFERENCES public.attendees(id) ON DELETE SET NULL,
  match_method        TEXT,  -- 'external_id' | 'auto_tag' | 'email' | 'manual' | 'unmatched'
  processed_at        TIMESTAMP WITH TIME ZONE,
  error               TEXT,
  created_at          TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  -- Idempotency. Smartwaiver retries every 5 minutes up to 5 times on any
  -- non-2xx, so without this a retry would mark the same waiver signed twice.
  UNIQUE (unique_id, event)
);

ALTER TABLE public.smartwaiver_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can manage smartwaiver events"
  ON public.smartwaiver_events FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

REVOKE ALL ON public.smartwaiver_events FROM anon, authenticated;
GRANT ALL ON public.smartwaiver_events TO service_role;
