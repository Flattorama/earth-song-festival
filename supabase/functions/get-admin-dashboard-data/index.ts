import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

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
    const [attendeesRes, purchasesRes, minorWaiversRes] = await Promise.all([
      supabase
        .from("attendees")
        .select(
          "id, name, email, phone, is_buyer, waiver_status, waiver_signed_at, created_at, purchase_id"
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

    return new Response(
      JSON.stringify({
        attendees: attendeesRes.data || [],
        purchases: purchasesRes.data || [],
        minorWaivers: minorWaiversRes.data || [],
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
