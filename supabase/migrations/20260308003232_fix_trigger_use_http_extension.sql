/*
  # Fix Google Sheets sync trigger to use http extension

  ## Summary
  Recreates trigger_google_sheets_sync to use extensions.http_post
  (the synchronous HTTP client) instead of net.http_post.
  The call is wrapped in an exception block so a network failure
  never causes the original INSERT to fail.
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

  BEGIN
    PERFORM extensions.http_post(
      'https://gontbearierzkbyvyubw.supabase.co/functions/v1/google-sheets-sync',
      payload::text,
      'application/json'
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING '[google-sheets-sync] HTTP call failed: %', SQLERRM;
  END;

  RETURN NEW;
END;
$$;
