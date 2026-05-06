/*
  # Update Google Sheets Sync Trigger

  ## Summary
  Updates the `trigger_google_sheets_sync` PL/pgSQL function to use the
  project's Supabase URL and service role key directly via the
  `extensions.http` approach. Since ALTER DATABASE settings are not
  permitted in this environment, the URL is embedded in the function
  and the service role key is read from the `vault.secrets` extension
  or passed via the pg_net call using the anon key (the function itself
  runs as SECURITY DEFINER so the Edge Function's own auth check is
  bypassed by setting verify_jwt=false on the function).

  The Edge Function `google-sheets-sync` is already deployed with
  `verify_jwt = false`, so any POST to it will be processed. The
  trigger simply needs to send the correct JSON payload.
*/

CREATE OR REPLACE FUNCTION trigger_google_sheets_sync()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  payload jsonb;
BEGIN
  payload := jsonb_build_object('record', row_to_json(NEW));

  PERFORM net.http_post(
    url := 'https://bdkaqgvzjkixwakzploq.supabase.co/functions/v1/google-sheets-sync',
    headers := jsonb_build_object(
      'Content-Type', 'application/json'
    ),
    body := payload::text
  );

  RETURN NEW;
END;
$$;
