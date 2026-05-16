ALTER TABLE public.purchases
  ADD COLUMN IF NOT EXISTS order_summary JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS adult_ticket_type TEXT,
  ADD COLUMN IF NOT EXISTS adult_ticket_count INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS youth_ticket_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_ticket_count INTEGER NOT NULL DEFAULT 1;

ALTER TABLE public.waiver_acceptances
  ADD COLUMN IF NOT EXISTS checkout_attempt_id UUID;

UPDATE public.purchases
SET
  adult_ticket_type = COALESCE(adult_ticket_type, ticket_type),
  adult_ticket_count = CASE WHEN adult_ticket_count < 1 THEN 1 ELSE adult_ticket_count END,
  total_ticket_count = CASE WHEN total_ticket_count < quantity THEN quantity ELSE total_ticket_count END;

CREATE TABLE IF NOT EXISTS public.minor_waiver_acceptances (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  guardian_name TEXT NOT NULL,
  guardian_email TEXT NOT NULL,
  guardian_phone TEXT DEFAULT '',
  guardian_address TEXT DEFAULT '',
  adult_ticket_type TEXT NOT NULL,
  minor_name TEXT NOT NULL,
  minor_date_of_birth DATE NOT NULL,
  youth_pass_type TEXT NOT NULL,
  youth_age_band TEXT NOT NULL,
  youth_ticket_label TEXT NOT NULL,
  youth_ticket_amount INTEGER NOT NULL DEFAULT 0,
  waiver_version TEXT NOT NULL,
  parent_initials_risk TEXT NOT NULL,
  parent_initials_indemnity TEXT NOT NULL,
  accepted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  ip_address TEXT DEFAULT '',
  stripe_session_id TEXT,
  checkout_attempt_id UUID,
  purchase_id UUID REFERENCES public.purchases(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.minor_waiver_acceptances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can manage minor waiver acceptances"
  ON public.minor_waiver_acceptances FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

REVOKE ALL ON public.minor_waiver_acceptances FROM anon, authenticated;
GRANT ALL ON public.minor_waiver_acceptances TO service_role;

CREATE INDEX IF NOT EXISTS idx_minor_waiver_acceptances_stripe_session
  ON public.minor_waiver_acceptances (stripe_session_id);

CREATE INDEX IF NOT EXISTS idx_minor_waiver_acceptances_purchase
  ON public.minor_waiver_acceptances (purchase_id);

CREATE OR REPLACE FUNCTION trigger_minor_google_sheets_sync()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  payload jsonb;
BEGIN
  payload := jsonb_build_object('type', 'minor_waiver', 'record', row_to_json(NEW));

  BEGIN
    PERFORM extensions.http_post(
      'https://bdkaqgvzjkixwakzploq.supabase.co/functions/v1/google-sheets-sync',
      payload::text,
      'application/json'
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING '[google-sheets-sync] minor waiver HTTP call failed: %', SQLERRM;
  END;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_minor_waiver_acceptance_insert ON public.minor_waiver_acceptances;

CREATE TRIGGER on_minor_waiver_acceptance_insert
  AFTER INSERT ON public.minor_waiver_acceptances
  FOR EACH ROW
  EXECUTE FUNCTION trigger_minor_google_sheets_sync();
