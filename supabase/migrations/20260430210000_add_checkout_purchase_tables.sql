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

CREATE POLICY "Anyone can submit and read attendee waiver data"
  ON public.attendees FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

ALTER TABLE public.waiver_acceptances
  ADD COLUMN IF NOT EXISTS accepted_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  ADD COLUMN IF NOT EXISTS ip_address TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS stripe_session_id TEXT;
