/*
  # Schedule the waiver reconciliation

  Runs the `waiver-reconcile` edge function every 6 hours. That function sends
  the initial waiver email to anyone the Stripe webhook missed, asks Smartwaiver
  whether any pending attendee has actually signed (catching a webhook that was
  never delivered or was permanently cancelled after 5 failed retries), sends
  reminders on a cadence that tightens as the festival approaches, and reports
  the totals to Slack and email.

  Six-hourly is deliberate for the run-up to August 7-9, 2026. Drop it to daily
  after the festival:
    select cron.unschedule('waiver-reconcile-6h');
    select cron.schedule('waiver-reconcile-6h', '0 8 * * *', $$ ... $$);

  ## One-time manual setup BEFORE this schedule will work
  1. Deploy the edge function with JWT verification OFF (the cron call
     authenticates with the x-reconcile-token header, which the function
     checks itself — not a Supabase JWT). CI does this from deploy.yaml, so
     this only matters if you deploy by hand:
       supabase functions deploy waiver-reconcile --project-ref bdkaqgvzjkixwakzploq --no-verify-jwt
  2. Set the edge-function secrets (Dashboard -> Edge Functions -> Secrets):
       SMARTWAIVER_API_KEY, SMARTWAIVER_TEMPLATE_ID, INTERNAL_FUNCTION_TOKEN,
       WAIVER_EMAIL_FROM, FESTIVAL_START_DATE
     (RECONCILE_TOKEN, RESEND_API_KEY, SLACK_WEBHOOK_URL, ALERT_EMAIL_TO and
     ALERT_EMAIL_FROM already exist for sync-reconcile — confirm they are
     genuinely set, that function treats several of them as optional.)
  3. The existing `reconcile_token` Vault secret is reused, so there is nothing
     new to store. It was created for sync-reconcile with:
       select vault.create_secret('THE_RECONCILE_TOKEN', 'reconcile_token');

  Before the first real send, dry-run it and read the action list:
    curl -X POST https://bdkaqgvzjkixwakzploq.supabase.co/functions/v1/waiver-reconcile \
      -H "x-reconcile-token: $RECONCILE_TOKEN" \
      -H "Content-Type: application/json" \
      -d '{"mode":"backfill","dryRun":true}'

  Time is UTC. The schedule below fires at 00:00, 06:00, 12:00 and 18:00 UTC.
*/

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Replace any existing schedule with the same name.
SELECT cron.unschedule('waiver-reconcile-6h')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'waiver-reconcile-6h');

SELECT cron.schedule(
  'waiver-reconcile-6h',
  '0 */6 * * *',
  $$
  SELECT net.http_post(
    url     := 'https://bdkaqgvzjkixwakzploq.supabase.co/functions/v1/waiver-reconcile',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-reconcile-token', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'reconcile_token')
    ),
    body    := '{}'::text
  );
  $$
);
