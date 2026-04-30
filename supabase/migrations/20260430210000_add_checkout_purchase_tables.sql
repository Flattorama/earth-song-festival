CREATE TABLE IF NOT EXISTS public.purchases (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  stripe_session_id TEXT NOT NULL UNIQUE,
  buyer_name TEXT NOT NULL DEFAULT '',
  buyer_email TEXT NOT NULL DEFAULT '',
  ticket_type TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  referral_code TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.purchases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can manage purchases"
  ON public.purchases FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

REVOKE ALL ON public.purchases FROM anon, authenticated;
GRANT ALL ON public.purchases TO service_role;

CREATE TABLE IF NOT EXISTS public.attendees (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  purchase_id UUID NOT NULL REFERENCES public.purchases(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  phone TEXT DEFAULT '',
  is_buyer BOOLEAN NOT NULL DEFAULT false,
  waiver_status TEXT NOT NULL DEFAULT 'pending',
  waiver_signed_at TIMESTAMP WITH TIME ZONE,
  waiver_ip_address TEXT DEFAULT '',
  waiver_token TEXT NOT NULL DEFAULT encode(gen_random_bytes(24), 'hex'),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (purchase_id, email)
);

ALTER TABLE public.attendees ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can manage attendees"
  ON public.attendees FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

REVOKE ALL ON public.attendees FROM anon, authenticated;
GRANT ALL ON public.attendees TO service_role;

ALTER TABLE public.waiver_acceptances
  ADD COLUMN IF NOT EXISTS accepted_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  ADD COLUMN IF NOT EXISTS ip_address TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS stripe_session_id TEXT;
