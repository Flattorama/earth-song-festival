import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import {
  type AttendeeWaiverState,
  decideStatusChange,
  isWaiverStatus,
} from "./helpers.ts";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey, X-Admin-Token",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const adminToken = Deno.env.get("ADMIN_DASHBOARD_TOKEN");
    const providedToken = req.headers.get("x-admin-token");

    if (!adminToken || providedToken !== adminToken) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(JSON.stringify({ error: "Supabase is not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Admin-only proxy for resending a waiver email. Done here rather than from
    // the browser so INTERNAL_FUNCTION_TOKEN never leaves the server -- the
    // admin token the dashboard holds is the only credential the client needs.
    let action: string | null = null;
    let actionAttendeeId: string | null = null;
    let actionStatus: unknown = null;
    try {
      const raw = await req.text();
      if (raw.trim()) {
        const parsed = JSON.parse(raw);
        action = typeof parsed?.action === "string" ? parsed.action : null;
        actionAttendeeId = typeof parsed?.attendeeId === "string" ? parsed.attendeeId : null;
        actionStatus = parsed?.status;
      }
    } catch {
      // No body, or not JSON. Treated as a plain dashboard read.
    }

    if (action === "resend-waiver") {
      const internalToken = Deno.env.get("INTERNAL_FUNCTION_TOKEN");
      if (!internalToken) {
        return new Response(
          JSON.stringify({ error: "INTERNAL_FUNCTION_TOKEN is not set" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      if (!actionAttendeeId) {
        return new Response(JSON.stringify({ error: "attendeeId is required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const resendRes = await fetch(`${supabaseUrl}/functions/v1/send-waiver-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-internal-token": internalToken },
        body: JSON.stringify({ attendeeId: actionAttendeeId, force: true }),
      });

      const detail = await resendRes.text();
      if (!resendRes.ok) {
        console.error(`[get-admin-dashboard-data] resend failed: ${resendRes.status} ${detail}`);
        return new Response(JSON.stringify({ error: "Resend failed", detail }), {
          status: 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ resent: true, detail }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Manual status switch, for a paper waiver collected at the gate. The rules
    // about what may change live in decideStatusChange so they are unit-tested.
    if (action === "set-waiver-status") {
      if (!actionAttendeeId || !UUID_RE.test(actionAttendeeId)) {
        return new Response(JSON.stringify({ error: "attendeeId must be a UUID" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (!isWaiverStatus(actionStatus)) {
        return new Response(
          JSON.stringify({ error: 'status must be "signed" or "pending"' }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      const { data: current, error: readError } = await supabase
        .from("attendees")
        .select("waiver_status, waiver_signed_method, smartwaiver_id")
        .eq("id", actionAttendeeId)
        .maybeSingle();
      if (readError) throw readError;
      if (!current) {
        return new Response(JSON.stringify({ error: "No attendee found for that id" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const decision = decideStatusChange(
        current as AttendeeWaiverState,
        actionStatus,
        new Date(),
      );
      if (!decision.allowed) {
        return new Response(JSON.stringify({ error: decision.reason }), {
          status: 409,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { error: updateError } = await supabase
        .from("attendees")
        .update(decision.updates)
        .eq("id", actionAttendeeId);
      if (updateError) throw updateError;

      return new Response(
        JSON.stringify({ updated: true, status: decision.updates.waiver_status }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const [attendeesRes, purchasesRes, minorWaiversRes, unmatchedRes] = await Promise.all([
      supabase
        .from("attendees")
        .select(
          "id, name, email, phone, is_buyer, is_minor, waiver_status, waiver_signed_at, waiver_signed_method, waiver_email_sent_at, waiver_reminder_count, waiver_last_reminder_at, smartwaiver_id, smartwaiver_url, checked_in_at, created_at, purchase_id"
        )
        .order("created_at", { ascending: false }),
      supabase
        .from("purchases")
        .select(
          "id, buyer_name, buyer_email, ticket_type, quantity, adult_ticket_type, adult_ticket_count, youth_ticket_count, total_ticket_count, stripe_session_id, referral_code, created_at"
        )
        .order("created_at", { ascending: false }),
      supabase
        .from("minor_waiver_acceptances")
        .select(
          "id, purchase_id, guardian_name, guardian_email, guardian_phone, adult_ticket_type, minor_name, minor_date_of_birth, youth_pass_type, youth_age_band, youth_ticket_label, youth_ticket_amount, waiver_version, accepted_at, stripe_session_id, created_at"
        )
        .order("created_at", { ascending: false }),
      // Signed waivers we could not tie to a purchase. These need a human.
      supabase
        .from("smartwaiver_events")
        .select("id, unique_id, event, match_method, waiver_data, error, created_at")
        .eq("match_method", "unmatched")
        .order("created_at", { ascending: false })
        .limit(100),
    ]);

    if (attendeesRes.error) {
      throw attendeesRes.error;
    }
    if (purchasesRes.error) {
      throw purchasesRes.error;
    }
    if (minorWaiversRes.error) {
      throw minorWaiversRes.error;
    }
    // The smartwaiver_events table only exists after the tracking migration, so
    // tolerate its absence rather than blanking the whole dashboard.
    if (unmatchedRes.error) {
      console.error("[get-admin-dashboard-data] unmatched events:", unmatchedRes.error.message);
    }

    return new Response(
      JSON.stringify({
        attendees: attendeesRes.data || [],
        purchases: purchasesRes.data || [],
        minorWaivers: minorWaiversRes.data || [],
        unmatchedWaivers: unmatchedRes.error ? [] : unmatchedRes.data || [],
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[get-admin-dashboard-data] ERROR:", message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
