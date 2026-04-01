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