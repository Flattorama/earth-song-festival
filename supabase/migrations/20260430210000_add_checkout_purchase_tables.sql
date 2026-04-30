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

CREATE POLICY "Anyone can read purchases by checkout session"
  ON public.purchases FOR SELECT
  TO anon, authenticated
  USING (true);

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

CREATE POLICY "Anyone can submit attendee waiver data"
  ON public.attendees FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Anyone can sign pending attendee waiver"
  ON public.attendees FOR UPDATE
  TO anon, authenticated
  USING (waiver_status = 'pending')
  WITH CHECK (waiver_status = 'signed');

CREATE POLICY "Anyone can read attendee waiver status"
  ON public.attendees FOR SELECT
  TO anon, authenticated
  USING (true);

REVOKE ALL ON public.attendees FROM anon, authenticated;
GRANT SELECT (
  id,
  purchase_id,
  name,
  email,
  phone,
  is_buyer,
  waiver_status,
  waiver_signed_at,
  waiver_ip_address,
  created_at
) ON public.attendees TO anon, authenticated;
GRANT INSERT (
  purchase_id,
  name,
  email,
  phone,
  is_buyer,
  waiver_status,
  waiver_signed_at,
  waiver_ip_address
) ON public.attendees TO anon, authenticated;
GRANT UPDATE (
  name,
  email,
  phone,
  waiver_status,
  waiver_signed_at,
  waiver_ip_address
) ON public.attendees TO anon, authenticated;

ALTER TABLE public.waiver_acceptances
  ADD COLUMN IF NOT EXISTS accepted_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  ADD COLUMN IF NOT EXISTS ip_address TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS stripe_session_id TEXT;
