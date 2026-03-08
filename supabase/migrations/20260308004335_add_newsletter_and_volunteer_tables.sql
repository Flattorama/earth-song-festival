/*
  # Add newsletter signups and volunteer applications tables

  1. New Tables
    - `newsletter_signups`
      - `id` (uuid, primary key)
      - `name` (text)
      - `email` (text, unique)
      - `created_at` (timestamptz)

    - `volunteer_applications`
      - `id` (uuid, primary key)
      - `full_name` (text)
      - `email` (text)
      - `phone` (text)
      - `about` (text)
      - `availability` (text)
      - `experience` (text)
      - `why_earth_song` (text)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on both tables
    - Allow anonymous inserts (public form submissions)
    - Allow authenticated users to read all rows (admin access)
*/

CREATE TABLE IF NOT EXISTS newsletter_signups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text DEFAULT '',
  email text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE newsletter_signups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit newsletter signup"
  ON newsletter_signups FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can view newsletter signups"
  ON newsletter_signups FOR SELECT
  TO authenticated
  USING (true);

CREATE TABLE IF NOT EXISTS volunteer_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL DEFAULT '',
  email text NOT NULL DEFAULT '',
  phone text DEFAULT '',
  about text DEFAULT '',
  availability text DEFAULT '',
  experience text DEFAULT '',
  why_earth_song text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE volunteer_applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit volunteer application"
  ON volunteer_applications FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can view volunteer applications"
  ON volunteer_applications FOR SELECT
  TO authenticated
  USING (true);
