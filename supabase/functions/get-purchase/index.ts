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
    const { sessionId } = await req.json();

    if (typeof sessionId !== "string" || !sessionId.startsWith("cs_")) {
      return new Response(JSON.stringify({ error: "Invalid checkout session" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(JSON.stringify({ error: "Supabase is not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { data, error } = await supabase
      .from("purchases")
      .select("id, buyer_name, buyer_email, ticket_type, quantity, adult_ticket_count, youth_ticket_count, total_ticket_count")
      .eq("stripe_session_id", sessionId)
      .maybeSingle();

    if (error) {
      throw error;
    }

    // The waiver link is stored on the buyer's attendee row, not the purchase,
    // so the success page can offer "Sign my waiver now" without a detour to
    // the inbox. It is null until send-waiver-email has run, which is a second
    // or two behind the redirect -- the page falls back to the plain link.
    let smartwaiverUrl: string | null = null;
    let waiverStatus: string | null = null;

    if (data) {
      const { data: attendee, error: attendeeError } = await supabase
        .from("attendees")
        .select("smartwaiver_url, waiver_status")
        .eq("purchase_id", (data as { id: string }).id)
        .eq("is_buyer", true)
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();

      if (attendeeError) {
        console.error("[get-purchase] attendee lookup failed:", attendeeError.message);
      } else if (attendee) {
        const row = attendee as { smartwaiver_url: string | null; waiver_status: string | null };
        smartwaiverUrl = row.smartwaiver_url;
        waiverStatus = row.waiver_status;
      }
    }

    return new Response(
      JSON.stringify({
        purchase: data ? { ...data, smartwaiver_url: smartwaiverUrl, waiver_status: waiverStatus } : null,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[get-purchase] ERROR:", message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
