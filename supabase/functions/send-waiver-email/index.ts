// Emails a buyer their Smartwaiver link after payment.
//
// Smartwaiver's API v4 has no endpoint that sends a waiver email, so we create a
// prefilled link through their API and send it ourselves via Resend.
//
// Invoked by stripe-webhook after a purchase lands, by waiver-reconcile for
// anything that slipped through, and by the admin dashboard for a manual resend.
//
// This function is deployed with verify_jwt = false and is therefore publicly
// reachable. The x-internal-token guard is what stops it being an open mail
// relay -- do not remove it.
//
// Required secrets (Supabase Dashboard -> Edge Functions -> Secrets):
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY   (auto-provided)
//   INTERNAL_FUNCTION_TOKEN  - shared secret; caller must send it as x-internal-token
//   SMARTWAIVER_API_KEY      - Bearer key for api.smartwaiver.com
//   SMARTWAIVER_TEMPLATE_ID  - the waiver template, e.g. 9cayh4ucp8knmwybehfh4a
//   RESEND_API_KEY           - transactional sender
//   WAIVER_EMAIL_FROM        - verified sender, e.g. "Earth Song <hello@earthsongfestival.com>"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey, x-internal-token",
};

const FESTIVAL_DATES = "August 7-9, 2026";
const FESTIVAL_LOCATION = "Still Life Retreat, West Grey, Ontario";

// Smartwaiver prefill links expire; 2,592,000s = 30 days is the API maximum.
const PREFILL_EXPIRATION_SECONDS = 2592000;

const TICKET_LABELS: Record<string, string> = {
  "early-bird": "Early Bird ticket (full weekend)",
  "regular-admission": "Regular Admission (full weekend)",
  "friday-day-pass": "Friday Day Pass",
  "saturday-day-pass": "Saturday Day Pass",
  "sunday-day-pass": "Sunday Day Pass",
};

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface RequestBody {
  purchaseId?: unknown;
  attendeeId?: unknown;
  force?: unknown;
}

interface AttendeeRow {
  id: string;
  purchase_id: string;
  name: string;
  email: string;
  waiver_email_sent_at: string | null;
  waiver_status: string;
}

interface PurchaseRow {
  id: string;
  buyer_name: string;
  buyer_email: string;
  ticket_type: string;
  adult_ticket_type: string | null;
  adult_ticket_count: number | null;
  youth_ticket_count: number | null;
}

function json(body: Record<string, unknown>, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

/**
 * Smartwaiver's external_id accepts alphanumerics and underscores only, up to
 * 128 chars -- a UUID's dashes are rejected. Stripping them gives 32 hex chars
 * that rehydrate back to the purchase id on the webhook side.
 */
export function toExternalId(purchaseId: string): string {
  return purchaseId.replace(/-/g, "");
}

/**
 * Smartwaiver wants first and last name separately. Split on the LAST space so
 * "Mary Anne Van Der Berg" keeps the surname intact; a single-token name goes
 * in firstName and lastName stays empty.
 */
export function splitName(full: string): { firstName: string; lastName: string } {
  const trimmed = (full || "").trim().replace(/\s+/g, " ");
  if (!trimmed) return { firstName: "", lastName: "" };
  const idx = trimmed.lastIndexOf(" ");
  if (idx === -1) return { firstName: trimmed, lastName: "" };
  return { firstName: trimmed.slice(0, idx), lastName: trimmed.slice(idx + 1) };
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function ticketLabel(purchase: PurchaseRow): string {
  const slug = purchase.adult_ticket_type || purchase.ticket_type || "";
  return TICKET_LABELS[slug] || "Earth Song ticket";
}

/** "2 x Regular Admission (full weekend), plus 1 youth ticket" */
function orderSummary(purchase: PurchaseRow): string {
  const adults = Math.max(purchase.adult_ticket_count ?? 1, 1);
  const youth = purchase.youth_ticket_count ?? 0;
  const label = ticketLabel(purchase);
  const adultPart = adults > 1 ? `${adults} x ${label}` : label;
  if (youth < 1) return adultPart;
  return `${adultPart}, plus ${youth} youth ticket${youth > 1 ? "s" : ""}`;
}

/**
 * Ask Smartwaiver for a prefilled link. Returns null on any failure so the
 * caller can fall back to the plain template URL -- a Smartwaiver outage must
 * never stop the email going out.
 */
async function createPrefillUrl(
  templateId: string,
  apiKey: string,
  name: string,
  email: string,
  externalId: string,
): Promise<string | null> {
  const { firstName, lastName } = splitName(name);

  try {
    const res = await fetch(
      `https://api.smartwaiver.com/v4/templates/${templateId}/prefill`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          expiration: PREFILL_EXPIRATION_SECONDS,
          email,
          participants: [{ firstName, lastName }],
          external_id: externalId,
          // Parents need the "anyone else need to sign?" button to add children.
          anyoneElseHidden: false,
          // lockdownPrefill is deliberately unset: people mistype their own
          // email at checkout and must be able to correct it on the form.
        }),
      },
    );

    if (!res.ok) {
      console.error(
        `[send-waiver-email] prefill failed: HTTP ${res.status} ${await res.text()}`,
      );
      return null;
    }

    const payload = await res.json();
    const url = payload?.prefill?.url || payload?.url || null;
    if (typeof url !== "string" || !url) {
      console.error("[send-waiver-email] prefill response had no url");
      return null;
    }
    return url;
  } catch (error) {
    console.error(`[send-waiver-email] prefill threw: ${String(error)}`);
    return null;
  }
}

function buildEmail(
  firstName: string,
  summary: string,
  waiverUrl: string,
): { subject: string; html: string; text: string } {
  const subject = "Your Earth Song waiver — 2 minutes, required before entry";
  const greeting = firstName ? `Hi ${firstName},` : "Hi there,";

  const text = [
    greeting,
    "",
    `Thank you for booking your place at Earth Song Festival Retreat. Your order: ${summary}.`,
    "",
    "Before you arrive we need a signed liability waiver from you. It takes about two minutes:",
    "",
    waiverUrl,
    "",
    "EVERY ADULT SIGNS THEIR OWN WAIVER",
    "One waiver covers one adult. If you bought tickets for other adults, please forward",
    "this email to each of them. No one can sign on another adult's behalf, and buying",
    "someone's ticket does not waive on their behalf, so without their own waiver they",
    "cannot enter.",
    "",
    "BRINGING CHILDREN?",
    'On the first screen select BOTH "Adult" and "Minor(s)". If you select only "Minor(s)"',
    "you will sign for your children but not for yourself. You can add up to 10 minors on",
    "the one form.",
    "",
    FESTIVAL_DATES,
    FESTIVAL_LOCATION,
    "",
    "See you in August,",
    "The Earth Song team",
  ].join("\n");

  const html = `<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#FAF7F2;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#FAF7F2;padding:24px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:12px;padding:32px;font-family:Helvetica,Arial,sans-serif;color:#2D2D2D;font-size:16px;line-height:1.6;">
            <tr><td>
              <p style="margin:0 0 16px;">${escapeHtml(greeting)}</p>
              <p style="margin:0 0 16px;">Thank you for booking your place at Earth Song Festival Retreat. Your order: <strong>${escapeHtml(summary)}</strong>.</p>
              <p style="margin:0 0 24px;">Before you arrive we need a signed liability waiver from you. It takes about two minutes.</p>

              <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 28px;">
                <tr><td style="border-radius:8px;background:#2B6B4A;">
                  <a href="${escapeHtml(waiverUrl)}" style="display:inline-block;padding:14px 28px;font-size:17px;font-weight:600;color:#ffffff;text-decoration:none;">Sign your waiver</a>
                </td></tr>
              </table>

              <p style="margin:0 0 8px;font-weight:600;">Every adult signs their own waiver</p>
              <p style="margin:0 0 20px;">One waiver covers one adult. If you bought tickets for other adults, please forward this email to each of them. No one can sign on another adult's behalf, and buying someone's ticket does not waive on their behalf, so without their own waiver they cannot enter.</p>

              <p style="margin:0 0 8px;font-weight:600;">Bringing children?</p>
              <p style="margin:0 0 20px;">On the first screen select <strong>both &quot;Adult&quot; and &quot;Minor(s)&quot;</strong>. If you select only &quot;Minor(s)&quot; you will sign for your children but not for yourself. You can add up to 10 minors on the one form.</p>

              <p style="margin:0 0 4px;">${FESTIVAL_DATES}</p>
              <p style="margin:0 0 24px;color:#666;">${FESTIVAL_LOCATION}</p>

              <p style="margin:0 0 8px;font-size:14px;color:#666;">If the button does not work, paste this into your browser:</p>
              <p style="margin:0 0 24px;font-size:13px;word-break:break-all;"><a href="${escapeHtml(waiverUrl)}" style="color:#2B6B4A;">${escapeHtml(waiverUrl)}</a></p>

              <p style="margin:0;">See you in August,<br />The Earth Song team</p>
            </td></tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  return { subject, html, text };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  const expectedToken = Deno.env.get("INTERNAL_FUNCTION_TOKEN");
  if (!expectedToken || req.headers.get("x-internal-token") !== expectedToken) {
    return json({ error: "Unauthorized" }, 403);
  }

  try {
    let body: RequestBody;
    try {
      body = await req.json();
    } catch {
      return json({ error: "Body must be JSON" }, 400);
    }

    const purchaseId = typeof body.purchaseId === "string" ? body.purchaseId.trim() : "";
    const attendeeId = typeof body.attendeeId === "string" ? body.attendeeId.trim() : "";
    const force = body.force === true;

    if (!purchaseId && !attendeeId) {
      return json({ error: "purchaseId or attendeeId is required" }, 400);
    }
    if (purchaseId && !UUID_RE.test(purchaseId)) {
      return json({ error: "purchaseId must be a UUID" }, 400);
    }
    if (attendeeId && !UUID_RE.test(attendeeId)) {
      return json({ error: "attendeeId must be a UUID" }, 400);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const templateId = Deno.env.get("SMARTWAIVER_TEMPLATE_ID");
    const smartwaiverKey = Deno.env.get("SMARTWAIVER_API_KEY");
    const resendKey = Deno.env.get("RESEND_API_KEY");
    const from = Deno.env.get("WAIVER_EMAIL_FROM");

    if (!supabaseUrl || !supabaseServiceKey) {
      return json({ error: "Supabase is not configured" }, 500);
    }
    if (!templateId) {
      return json({ error: "SMARTWAIVER_TEMPLATE_ID is not set" }, 500);
    }
    if (!resendKey || !from) {
      return json({ error: "Email sending is not configured" }, 500);
    }

    const { createClient } = await import(
      "https://esm.sh/@supabase/supabase-js@2.49.4"
    );
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Resolve the attendee. A purchaseId means "the buyer on that purchase".
    let attendee: AttendeeRow | null = null;
    const attendeeColumns =
      "id, purchase_id, name, email, waiver_email_sent_at, waiver_status";

    if (attendeeId) {
      const { data, error } = await supabase
        .from("attendees")
        .select(attendeeColumns)
        .eq("id", attendeeId)
        .maybeSingle();
      if (error) throw error;
      attendee = data as AttendeeRow | null;
    } else {
      const { data, error } = await supabase
        .from("attendees")
        .select(attendeeColumns)
        .eq("purchase_id", purchaseId)
        .eq("is_buyer", true)
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      attendee = data as AttendeeRow | null;
    }

    if (!attendee) {
      return json({ error: "No attendee found for that id" }, 404);
    }
    if (!attendee.email) {
      console.error(`[send-waiver-email] attendee ${attendee.id} has no email`);
      return json({ error: "Attendee has no email address" }, 422);
    }

    if (attendee.waiver_email_sent_at && !force) {
      return json({ skipped: true, reason: "already sent" }, 200);
    }

    const { data: purchaseData, error: purchaseError } = await supabase
      .from("purchases")
      .select(
        "id, buyer_name, buyer_email, ticket_type, adult_ticket_type, adult_ticket_count, youth_ticket_count",
      )
      .eq("id", attendee.purchase_id)
      .maybeSingle();
    if (purchaseError) throw purchaseError;
    if (!purchaseData) {
      return json({ error: "Purchase not found for attendee" }, 404);
    }
    const purchase = purchaseData as PurchaseRow;

    const externalId = toExternalId(purchase.id);
    const name = attendee.name || purchase.buyer_name || "";

    let waiverUrl = smartwaiverKey
      ? await createPrefillUrl(templateId, smartwaiverKey, name, attendee.email, externalId)
      : null;
    const usedFallback = waiverUrl === null;

    if (usedFallback) {
      waiverUrl =
        `https://waiver.smartwaiver.com/w/${templateId}/web/?auto_tag=${externalId}`;
      console.error(
        `[send-waiver-email] falling back to plain template URL for purchase ${purchase.id}`,
      );
    }

    // Store the link before sending so PaymentSuccess can render its
    // "Sign my waiver now" button even if the email itself is slow or fails.
    const { error: urlError } = await supabase
      .from("attendees")
      .update({ smartwaiver_url: waiverUrl })
      .eq("id", attendee.id);
    if (urlError) {
      console.error(`[send-waiver-email] could not store url: ${urlError.message}`);
    }

    const { firstName } = splitName(name);
    const { subject, html, text } = buildEmail(
      firstName,
      orderSummary(purchase),
      waiverUrl as string,
    );

    const sendRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from, to: [attendee.email], subject, html, text }),
    });

    if (!sendRes.ok) {
      const detail = await sendRes.text();
      console.error(
        `[send-waiver-email] Resend rejected the send for attendee ${attendee.id}: HTTP ${sendRes.status} ${detail}`,
      );
      // waiver_email_sent_at is left unset on purpose: waiver-reconcile picks up
      // anything still pending without an email and tries again.
      return json({ error: "Email send failed" }, 502);
    }

    const { error: stampError } = await supabase
      .from("attendees")
      .update({ waiver_email_sent_at: new Date().toISOString() })
      .eq("id", attendee.id);
    if (stampError) throw stampError;

    return json(
      { sent: true, attendeeId: attendee.id, usedFallback, url: waiverUrl },
      200,
    );
  } catch (error) {
    console.error(`[send-waiver-email] ${String(error)}`);
    return json({ error: "Unexpected error sending waiver email" }, 500);
  }
});
