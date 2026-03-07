/*
  # Add Google Sheets Sync Trigger

  ## Summary
  Sets up an automatic trigger that fires whenever a new row is inserted into
  the `waiver_acceptances` table. The trigger calls the `google-sheets-sync`
  Edge Function, which appends the new record to a connected Google Sheet.

  ## Changes
  1. Creates a PL/pgSQL function `trigger_google_sheets_sync` that uses
     `pg_net` (Supabase's built-in HTTP extension) to POST the new record
     to the Edge Function endpoint.
  2. Creates an AFTER INSERT trigger `on_waiver_acceptance_insert` on
     `waiver_acceptances` that invokes the function above.

  ## Notes
  - The trigger is non-blocking: it fires asynchronously so it does not
    slow down the checkout flow.
  - If the Edge Function secrets (GOOGLE_SERVICE_ACCOUNT_KEY,
    GOOGLE_SPREADSHEET_ID) are not yet configured, the function will return
    an error that is logged but does not affect the database write.
*/

CREATE OR REPLACE FUNCTION trigger_google_sheets_sync()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  supabase_url text;
  service_role_key text;
  payload jsonb;
BEGIN
  supabase_url := current_setting('app.supabase_url', true);
  service_role_key := current_setting('app.service_role_key', true);

  payload := jsonb_build_object('record', row_to_json(NEW));

  PERFORM net.http_post(
    url := supabase_url || '/functions/v1/google-sheets-sync',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || service_role_key
    ),
    body := payload::text
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_waiver_acceptance_insert ON waiver_acceptances;

CREATE TRIGGER on_waiver_acceptance_insert
  AFTER INSERT ON waiver_acceptances
  FOR EACH ROW
  EXECUTE FUNCTION trigger_google_sheets_sync();
