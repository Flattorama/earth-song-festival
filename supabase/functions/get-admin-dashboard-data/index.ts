import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(JSON.stringify({ error: "Supabase is not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const [attendeesRes, purchasesRes] = await Promise.all([
      supabase
        .from("attendees")
        .select(
          "id, name, email, phone, is_buyer, waiver_status, waiver_signed_at, created_at, purchase_id"
        )
        .order("created_at", { ascending: false }),
      supabase
        .from("purchases")
        .select(
          "id, buyer_name, buyer_email, ticket_type, quantity, stripe_session_id, referral_code, created_at"
        )
        .order("created_at", { ascending: false }),
    ]);

    if (attendeesRes.error) {
      throw attendeesRes.error;
    }
    if (purchasesRes.error) {
      throw purchasesRes.error;
    }

    return new Response(
      JSON.stringify({
        attendees: attendeesRes.data || [],
        purchases: purchasesRes.data || [],
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
