// Belt and braces for the emailed-waiver flow. Runs on pg_cron every 6 hours.
//
// Each run:
//   1. sends the initial email to anyone pending who never got one (catches a
//      failed stripe-webhook invocation),
//   2. asks Smartwaiver whether any pending attendee has actually signed
//      (catches a missed or cancelled webhook),
//   3. sends reminders on a cadence that tightens as the festival approaches,
//   4. reports the totals to Slack and email.
//
// Body options:
//   { "dryRun": true }        - log every intended action, send nothing
//   { "mode": "backfill" }    - ignore the reminder cadence and email every
//                               pending attendee once
//
// Rate limits: Smartwaiver allows 100 requests/minute per account. This uses
// GET /v4/waivers?external_id=... which sits in that bucket, NOT /v4/search,
// which is capped at 5/minute.
//
// Required secrets (Supabase Dashboard -> Edge Functions -> Secrets):
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY   (auto-provided)
//   RECONCILE_TOKEN          - shared secret; caller sends it as x-reconcile-token
//   INTERNAL_FUNCTION_TOKEN  - to call send-waiver-email
//   SMARTWAIVER_API_KEY, SMARTWAIVER_TEMPLATE_ID
//   FESTIVAL_START_DATE      - e.g. 2026-08-07; drives reminder urgency
//   RESEND_API_KEY, WAIVER_EMAIL_FROM
//   ALERT_EMAIL_TO, ALERT_EMAIL_FROM, SLACK_WEBHOOK_URL  - optional, for the summary

import {
  daysUntilFestival,
  decideReminder,
  reminderBody,
  reminderSubject,
  type ReminderCandidate,
} from "./helpers.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey, x-reconcile-token",
};

// Smartwaiver allows 100 req/min. 400ms between calls keeps us near 150/min
// worst case, so we also cap how many we check in a single run.
const SMARTWAIVER_DELAY_MS = 400;
const MAX_SMARTWAIVER_CHECKS = 60;

interface PendingAttendee {
  id: string;
  name: string;
  email: string;
  is_buyer: boolean;
  purchase_id: string;
  smartwaiver_url: string | null;
  waiver_email_sent_at: string | null;
  waiver_reminder_count: number;
  waiver_last_reminder_at: string | null;
  purchases: { id: string; created_at: string } | null;
}

interface Summary {
  dryRun: boolean;
  mode: string;
  pending: number;
  signed: number;
  markedSignedThisRun: number;
  unmatched: number;
  initialEmailsSent: number;
  remindersSent: number;
  smartwaiverChecked: number;
  skippedForRateLimit: number;
  errors: string[];
  actions: string[];
}

function jsonResponse(body: Record<string, unknown>, status: number): Response {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function toExternalId(purchaseId: string): string {
  return purchaseId.replace(/-/g, "");
}

function firstNameOf(fullName: string): string {
  return (fullName || "").trim().split(/\s+/)[0] || "";
}

async function sendSlack(text: string): Promise<void> {
  const webhook = Deno.env.get("SLACK_WEBHOOK_URL");
  if (!webhook) return;
  try {
    await fetch(webhook, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
  } catch (error) {
    console.error(`[waiver-reconcile] Slack post failed: ${String(error)}`);
  }
}

async function sendOpsEmail(subject: string, text: string): Promise<void> {
  const apiKey = Deno.env.get("RESEND_API_KEY");
  const to = Deno.env.get("ALERT_EMAIL_TO");
  const from = Deno.env.get("ALERT_EMAIL_FROM");
  if (!apiKey || !to || !from) return;
  try {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from,
        to: to.split(",").map((s) => s.trim()),
        subject,
        text,
      }),
    });
  } catch (error) {
    console.error(`[waiver-reconcile] ops email failed: ${String(error)}`);
  }
}

/** Sends one reminder through Resend using the participant-facing sender. */
async function sendReminderEmail(
  to: string,
  subject: string,
  text: string,
): Promise<boolean> {
  const apiKey = Deno.env.get("RESEND_API_KEY");
  const from = Deno.env.get("WAIVER_EMAIL_FROM");
  if (!apiKey || !from) {
    console.error("[waiver-reconcile] RESEND_API_KEY or WAIVER_EMAIL_FROM not set");
    return false;
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to: [to], subject, text }),
  });

  if (!res.ok) {
    console.error(`[waiver-reconcile] reminder send failed: HTTP ${res.status} ${await res.text()}`);
    return false;
  }
  return true;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const expectedToken = Deno.env.get("RECONCILE_TOKEN");
  if (!expectedToken || req.headers.get("x-reconcile-token") !== expectedToken) {
    return jsonResponse({ error: "Unauthorized" }, 401);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const internalToken = Deno.env.get("INTERNAL_FUNCTION_TOKEN");
  const festivalStartRaw = Deno.env.get("FESTIVAL_START_DATE");

  if (!supabaseUrl || !serviceKey) {
    return jsonResponse({ error: "Supabase is not configured" }, 500);
  }
  if (!internalToken) {
    return jsonResponse({ error: "INTERNAL_FUNCTION_TOKEN is not set" }, 500);
  }
  if (!festivalStartRaw) {
    return jsonResponse({ error: "FESTIVAL_START_DATE is not set" }, 500);
  }

  const festivalStart = new Date(`${festivalStartRaw}T00:00:00Z`);
  if (Number.isNaN(festivalStart.getTime())) {
    return jsonResponse({ error: "FESTIVAL_START_DATE is not a valid date" }, 500);
  }

  let body: { dryRun?: unknown; mode?: unknown } = {};
  try {
    const text = await req.text();
    if (text.trim()) body = JSON.parse(text);
  } catch {
    return jsonResponse({ error: "Body must be JSON" }, 400);
  }

  const dryRun = body.dryRun === true;
  const mode = body.mode === "backfill" ? "backfill" : "normal";
  const now = new Date();
  const daysOut = daysUntilFestival(now, festivalStart);

  const summary: Summary = {
    dryRun,
    mode,
    pending: 0,
    signed: 0,
    markedSignedThisRun: 0,
    unmatched: 0,
    initialEmailsSent: 0,
    remindersSent: 0,
    smartwaiverChecked: 0,
    skippedForRateLimit: 0,
    errors: [],
    actions: [],
  };

  const act = (line: string) => summary.actions.push(line);

  try {
    const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2.49.4");
    const supabase = createClient(supabaseUrl, serviceKey);

    const [{ count: signedCount }, { count: unmatchedCount }] = await Promise.all([
      supabase
        .from("attendees")
        .select("id", { count: "exact", head: true })
        .eq("waiver_status", "signed"),
      supabase
        .from("smartwaiver_events")
        .select("id", { count: "exact", head: true })
        .eq("match_method", "unmatched"),
    ]);
    summary.signed = signedCount ?? 0;
    summary.unmatched = unmatchedCount ?? 0;

    // Only adults need their own waiver; minors are signed for by a guardian.
    const { data: pendingRows, error: pendingError } = await supabase
      .from("attendees")
      .select(
        "id, name, email, is_buyer, purchase_id, smartwaiver_url, waiver_email_sent_at, waiver_reminder_count, waiver_last_reminder_at, purchases(id, created_at)",
      )
      .eq("waiver_status", "pending")
      .eq("is_minor", false)
      .order("created_at", { ascending: true });

    if (pendingError) throw pendingError;
    const pending = (pendingRows || []) as unknown as PendingAttendee[];
    summary.pending = pending.length;

    // ---- 1. Anyone pending who never received the initial email ----
    for (const attendee of pending) {
      if (attendee.waiver_email_sent_at) continue;
      if (!attendee.email) {
        summary.errors.push(`attendee ${attendee.id} has no email`);
        continue;
      }

      act(`initial email -> ${attendee.name || "(no name)"} <${attendee.email}>`);
      if (dryRun) {
        summary.initialEmailsSent++;
        continue;
      }

      try {
        const res = await fetch(`${supabaseUrl}/functions/v1/send-waiver-email`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-internal-token": internalToken },
          // Addressed by attendee, not purchase: a purchase id resolves to the
          // buyer, who has already been emailed, so send-waiver-email would
          // answer { skipped: true } and the other adults would never hear from
          // us at all.
          body: JSON.stringify({ attendeeId: attendee.id }),
        });
        if (res.ok) {
          summary.initialEmailsSent++;
          attendee.waiver_email_sent_at = new Date().toISOString();
        } else {
          summary.errors.push(
            `send-waiver-email HTTP ${res.status} for attendee ${attendee.id}`,
          );
        }
      } catch (error) {
        summary.errors.push(`send-waiver-email threw for ${attendee.id}: ${String(error)}`);
      }
    }

    // ---- 2. Ask Smartwaiver whether any of these actually signed ----
    const smartwaiverKey = Deno.env.get("SMARTWAIVER_API_KEY");
    const stillPending: PendingAttendee[] = [];

    if (smartwaiverKey) {
      for (const attendee of pending) {
        if (summary.smartwaiverChecked >= MAX_SMARTWAIVER_CHECKS) {
          summary.skippedForRateLimit++;
          stillPending.push(attendee);
          continue;
        }

        // Links now carry the attendee id. Older ones carry the purchase id, so
        // check both before concluding someone has not signed.
        const externalId = toExternalId(attendee.id);
        const legacyExternalId = toExternalId(attendee.purchase_id);
        try {
          const lookup = async (id: string) =>
            await fetch(
              `https://api.smartwaiver.com/v4/waivers?external_id=${id}&limit=5`,
              { headers: { Authorization: `Bearer ${smartwaiverKey}` } },
            );

          let res = await lookup(externalId);
          summary.smartwaiverChecked++;

          if (!res.ok) {
            summary.errors.push(`smartwaiver lookup HTTP ${res.status} for ${externalId}`);
            stillPending.push(attendee);
          } else {
            let payload = await res.json();
            let waivers = Array.isArray(payload?.waivers) ? payload.waivers : [];

            // Only the buyer could ever have signed under a purchase-scoped id.
            if (waivers.length === 0 && attendee.is_buyer) {
              await sleep(SMARTWAIVER_DELAY_MS);
              res = await lookup(legacyExternalId);
              summary.smartwaiverChecked++;
              if (res.ok) {
                payload = await res.json();
                waivers = Array.isArray(payload?.waivers) ? payload.waivers : [];
              }
            }

            if (waivers.length > 0) {
              const waiver = waivers[0];
              act(`already signed on Smartwaiver -> ${attendee.email} (marking signed)`);
              if (!dryRun) {
                const { error } = await supabase
                  .from("attendees")
                  .update({
                    waiver_status: "signed",
                    waiver_signed_at: waiver?.createdOn || new Date().toISOString(),
                    smartwaiver_id: waiver?.waiverId || waiver?.unique_id || null,
                  })
                  .eq("id", attendee.id);
                if (error) summary.errors.push(`marking signed failed: ${error.message}`);
              }
              summary.markedSignedThisRun++;
            } else {
              stillPending.push(attendee);
            }
          }
        } catch (error) {
          summary.errors.push(`smartwaiver lookup threw for ${externalId}: ${String(error)}`);
          stillPending.push(attendee);
        }

        await sleep(SMARTWAIVER_DELAY_MS);
      }
    } else {
      summary.errors.push("SMARTWAIVER_API_KEY not set; skipped signature check");
      stillPending.push(...pending);
    }

    // ---- 3. Reminders ----
    const templateId = Deno.env.get("SMARTWAIVER_TEMPLATE_ID");

    for (const attendee of stillPending) {
      if (!attendee.email) continue;

      const candidate: ReminderCandidate = {
        waiverReminderCount: attendee.waiver_reminder_count ?? 0,
        waiverLastReminderAt: attendee.waiver_last_reminder_at,
        waiverEmailSentAt: attendee.waiver_email_sent_at,
        purchaseCreatedAt: attendee.purchases?.created_at || new Date().toISOString(),
      };

      // Backfill ignores the cadence but still respects the hard cap and the
      // one-per-day rule, so running it twice cannot spam anyone.
      const decision =
        mode === "backfill"
          ? {
              send:
                candidate.waiverReminderCount < 5 &&
                !(
                  candidate.waiverLastReminderAt &&
                  new Date(candidate.waiverLastReminderAt).toDateString() === now.toDateString()
                ),
              reason: "backfill",
              urgent: false,
            }
          : decideReminder(candidate, now, festivalStart);

      if (!decision.send) continue;

      const waiverUrl =
        attendee.smartwaiver_url ||
        `https://waiver.smartwaiver.com/w/${templateId}/web/?auto_tag=${toExternalId(attendee.purchase_id)}`;

      act(
        `reminder (${decision.reason}) -> ${attendee.name || "(no name)"} <${attendee.email}>, ` +
          `reminder ${(attendee.waiver_reminder_count ?? 0) + 1} of 5`,
      );

      if (dryRun) {
        summary.remindersSent++;
        continue;
      }

      const ok = await sendReminderEmail(
        attendee.email,
        reminderSubject(decision.urgent, daysOut),
        reminderBody(firstNameOf(attendee.name), waiverUrl, daysOut),
      );

      if (ok) {
        summary.remindersSent++;
        const { error } = await supabase
          .from("attendees")
          .update({
            waiver_reminder_count: (attendee.waiver_reminder_count ?? 0) + 1,
            waiver_last_reminder_at: new Date().toISOString(),
          })
          .eq("id", attendee.id);
        if (error) summary.errors.push(`reminder bookkeeping failed: ${error.message}`);
      } else {
        summary.errors.push(`reminder send failed for ${attendee.email}`);
      }
    }

    // ---- 4. Report ----
    const headline =
      `Earth Song waivers — ${summary.signed} signed, ${summary.pending} pending` +
      (dryRun ? " (DRY RUN, nothing sent)" : "");

    const report = [
      headline,
      `${daysOut} day(s) until the festival${mode === "backfill" ? " — BACKFILL mode" : ""}`,
      "",
      `Initial emails sent:   ${summary.initialEmailsSent}`,
      `Reminders sent:        ${summary.remindersSent}`,
      `Newly marked signed:   ${summary.markedSignedThisRun}`,
      `Smartwaiver checks:    ${summary.smartwaiverChecked}` +
        (summary.skippedForRateLimit
          ? ` (${summary.skippedForRateLimit} deferred to the next run)`
          : ""),
      `Unmatched signatures:  ${summary.unmatched}` +
        (summary.unmatched ? "  <- these need a human, see the admin dashboard" : ""),
      "",
      summary.actions.length ? "Actions:" : "No actions were due.",
      ...summary.actions.map((line) => `  ${line}`),
      "",
      summary.errors.length ? `Errors (${summary.errors.length}):` : "No errors.",
      ...summary.errors.map((line) => `  ${line}`),
    ].join("\n");

    console.log(`[waiver-reconcile]\n${report}`);

    const shouldAlert =
      summary.errors.length > 0 ||
      summary.remindersSent > 0 ||
      summary.initialEmailsSent > 0 ||
      summary.unmatched > 0;

    if (shouldAlert && !dryRun) {
      await sendSlack(report);
      await sendOpsEmail(headline, report);
    }

    return jsonResponse({ ok: summary.errors.length === 0, summary, report }, 200);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[waiver-reconcile] ${message}`);
    await sendSlack(`Earth Song waiver-reconcile FAILED: ${message}`);
    return jsonResponse({ ok: false, error: message, summary }, 500);
  }
});
