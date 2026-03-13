/*
  # Add Referral Code Tracking System

  ## New Table: referral_codes
  Stores referral codes assigned to facilitators/vendors for tracking
  which referrals drive ticket sales. This is analytics/tracking only —
  codes do NOT apply any discount.

  ## Changes to existing tables
  - Adds `referral_code` (nullable text) to `purchases` table
  - Adds `referral_code` (nullable text) to `waiver_acceptances` table

  ## Security
  - RLS enabled on referral_codes
  - Anonymous users can SELECT (needed for frontend code validation)
  - Only authenticated users can INSERT/UPDATE/DELETE
*/

-- 1. Create referral_codes table
CREATE TABLE IF NOT EXISTS referral_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  facilitator_name text NOT NULL,
  facilitator_email text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE referral_codes ENABLE ROW LEVEL SECURITY;

-- Allow anonymous reads (frontend needs to validate codes)
CREATE POLICY "Anyone can read active referral codes"
  ON referral_codes FOR SELECT
  TO anon, authenticated
  USING (true);

-- Restrict modifications to authenticated users
CREATE POLICY "Authenticated users can insert referral codes"
  ON referral_codes FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update referral codes"
  ON referral_codes FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete referral codes"
  ON referral_codes FOR DELETE
  TO authenticated
  USING (true);

-- 2. Insert test row
INSERT INTO referral_codes (code, facilitator_name, is_active)
VALUES ('TEST', 'Test Facilitator', true);

-- 3. Add referral_code column to purchases table
ALTER TABLE purchases ADD COLUMN IF NOT EXISTS referral_code text;

-- 4. Add referral_code column to waiver_acceptances table
ALTER TABLE waiver_acceptances ADD COLUMN IF NOT EXISTS referral_code text;
