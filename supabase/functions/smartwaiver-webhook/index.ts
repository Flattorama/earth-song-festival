// Receives Smartwaiver account webhooks and marks attendees as signed.
//
// THE GOVERNING CONSTRAINT: Smartwaiver retries every 5 minutes up to 5 times on
// ANY non-2xx response, then cancels that waiver's webhook permanently. A
// permanently cancelled webhook is a signature we never learn about. So this
// function returns 2xx for everything it has handled, everything it cannot
// match, and everything it chooses to ignore. Non-2xx is reserved for genuine
// transient failures we actually want retried.
//
// The payload carries no signature to verify, so the only guard available is a
// shared secret in the registered URL: .../smartwaiver-webhook?k=<secret>
//
// Required secrets (Supabase Dashboard -> Edge Functions -> Secrets):
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY   (auto-provided)
//   SMARTWAIVER_API_KEY         - Bearer key for api.smartwaiver.com
//   SMARTWAIVER_WEBHOOK_SECRET  - must match the ?k= parameter on the registered URL

import {
  extractIdentifiers,
  extractMinors,
  fromExternalId,
  matchAttendee,
  syntheticMinorEmails,
  toExternalId,
} from "./helpers.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

// Postgres unique_violation. Our idempotency signal on (unique_id, event).
const UNIQUE_VIOLATION = "23505";

interface WebhookBody {
  unique_id?: unknown;
  event?: unknown;
}

function json(body: Record<string, unknown>, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const expectedSecret = Deno.env.get("SMARTWAIVER_WEBHOOK_SECRET");
  const providedSecret = new URL(req.url).searchParams.get("k");
  if (!expectedSecret || providedSecret !== expectedSecret) {
    console.error("[smartwaiver-webhook] rejected: bad or missing ?k= secret");
    return json({ error: "Forbidden" }, 403);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !supabaseServiceKey) {
    // Genuinely transient from Smartwaiver's point of view: a retry may succeed
    // once configuration is fixed, and nothing has been recorded yet.
    console.error("[smartwaiver-webhook] Supabase is not configured");
    return json({ error: "Not configured" }, 500);
  }

  let body: WebhookBody;
  try {
    body = await req.json();
  } catch {
    console.error("[smartwaiver-webhook] body was not JSON; acknowledging anyway");
    return json({ ignored: true, reason: "malformed body" }, 200);
  }

  const uniqueId = typeof body.unique_id === "string" ? body.unique_id.trim() : "";
  const event = typeof body.event === "string" ? body.event.trim() : "";

  if (!uniqueId || !event) {
    console.error("[smartwaiver-webhook] missing unique_id or event; acknowledging");
    return json({ ignored: true, reason: "missing unique_id or event" }, 200);
  }

  const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2.49.4");
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // Claim this (unique_id, event) first. The UNIQUE constraint is what makes a
  // retry a no-op rather than a second signature.
  const { data: eventRow, error: insertError } = await supabase
    .from("smartwaiver_events")
    .insert({ unique_id: uniqueId, event, raw_payload: body })
    .select("id")
    .single();

  if (insertError) {
    if (insertError.code === UNIQUE_VIOLATION) {
      return json({ duplicate: true }, 200);
    }
    console.error(`[smartwaiver-webhook] could not record event: ${insertError.message}`);
    return json({ error: "Could not record event" }, 500);
  }

  const eventId = (eventRow as { id: string }).id;

  // Everything past this point is best-effort. Failures are written to the event
  // row and still answered 2xx, because the alternative is Smartwaiver giving up
  // on this waiver forever.
  try {
    if (event !== "new-waiver") {
      await supabase
        .from("smartwaiver_events")
        .update({ processed_at: new Date().toISOString() })
        .eq("id", eventId);
      return json({ ignored: true, event }, 200);
    }

    const apiKey = Deno.env.get("SMARTWAIVER_API_KEY");
    if (!apiKey) throw new Error("SMARTWAIVER_API_KEY is not set");

    const detailRes = await fetch(
      `https://api.smartwaiver.com/v4/waivers/${encodeURIComponent(uniqueId)}`,
      { headers: { Authorization: `Bearer ${apiKey}` } },
    );
    if (!detailRes.ok) {
      throw new Error(`waiver fetch failed: HTTP ${detailRes.status} ${await detailRes.text()}`);
    }

    const detail = await detailRes.json();
    const waiver = (detail?.waiver ?? detail) as Record<string, unknown>;

    await supabase
      .from("smartwaiver_events")
      .update({ waiver_data: detail })
      .eq("id", eventId);

    const { externalId, autoTag, email } = extractIdentifiers(waiver);

    // Given a purchase id, the attendee we want is that purchase's buyer.
    const buyerAttendeeForPurchase = async (
      candidate: string | null,
    ): Promise<string | null> => {
      const purchaseId = fromExternalId(candidate);
      if (!purchaseId) return null;
      const { data } = await supabase
        .from("attendees")
        .select("id")
        .eq("purchase_id", purchaseId)
        .eq("is_buyer", true)
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();
      return (data as { id: string } | null)?.id ?? null;
    };

    const { attendeeId, method } = await matchAttendee({
      external_id: () => buyerAttendeeForPurchase(externalId),
      auto_tag: () => buyerAttendeeForPurchase(autoTag),
      email: async () => {
        if (!email) return null;
        // Most recent still-pending attendee with this address. Someone who
        // signed from a forwarded link lands here.
        const { data } = await supabase
          .from("attendees")
          .select("id")
          .ilike("email", email)
          .eq("waiver_status", "pending")
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        return (data as { id: string } | null)?.id ?? null;
      },
    });

    if (!attendeeId) {
      // A real signature we cannot tie to a purchase. Surfaced in the admin
      // dashboard for a human rather than dropped.
      console.error(
        `[smartwaiver-webhook] unmatched waiver ${uniqueId} (email: ${email ?? "none"})`,
      );
      await supabase
        .from("smartwaiver_events")
        .update({ match_method: "unmatched", processed_at: new Date().toISOString() })
        .eq("id", eventId);
      return json({ matched: false }, 200);
    }

    // Prefer the waiver's own timestamp over now() -- it is when they actually
    // signed, which may be well before the webhook reached us.
    const signedAt =
      typeof waiver.createdOn === "string" && waiver.createdOn.trim()
        ? waiver.createdOn
        : new Date().toISOString();

    const { data: signedAttendee, error: signError } = await supabase
      .from("attendees")
      .update({
        waiver_status: "signed",
        waiver_signed_at: signedAt,
        smartwaiver_id: uniqueId,
      })
      .eq("id", attendeeId)
      .select("purchase_id")
      .single();
    if (signError) throw signError;

    const purchaseId = (signedAttendee as { purchase_id: string }).purchase_id;

    // Minors named on the guardian's waiver become their own attendee rows, so
    // the registration desk can tell a real adult shortfall from a family that
    // is fully accounted for.
    const minors = extractMinors(waiver);
    let minorsRecorded = 0;

    if (minors.length > 0) {
      const emails = syntheticMinorEmails(
        minors.map((m) => m.name),
        toExternalId(purchaseId),
      );
      const rows = minors.map((minor, i) => ({
        purchase_id: purchaseId,
        name: minor.name,
        email: emails[i],
        is_buyer: false,
        is_minor: true,
        waiver_status: "signed",
        waiver_signed_at: signedAt,
        smartwaiver_id: uniqueId,
      }));

      const { error: minorError } = await supabase
        .from("attendees")
        .upsert(rows, { onConflict: "purchase_id,email" });

      if (minorError) {
        // The adult is already marked signed; losing the minors is worth logging
        // but not worth a retry storm.
        console.error(`[smartwaiver-webhook] minor upsert failed: ${minorError.message}`);
      } else {
        minorsRecorded = rows.length;
      }
    }

    await supabase
      .from("smartwaiver_events")
      .update({
        matched_attendee_id: attendeeId,
        match_method: method,
        processed_at: new Date().toISOString(),
      })
      .eq("id", eventId);

    return json({ matched: true, method, attendeeId, minorsRecorded }, 200);
  } catch (error) {
    const message = String(error);
    console.error(`[smartwaiver-webhook] ${message}`);
    await supabase
      .from("smartwaiver_events")
      .update({ error: message, processed_at: new Date().toISOString() })
      .eq("id", eventId);
    // Deliberately 200: the failure is recorded and we would rather investigate
    // it than have Smartwaiver cancel this waiver's webhook permanently.
    return json({ error: "logged", handled: false }, 200);
  }
});
