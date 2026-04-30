import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface AttendeeInput {
  name?: string;
  email?: string;
  phone?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { purchaseId, attendees } = await req.json();

    if (typeof purchaseId !== "string" || !Array.isArray(attendees)) {
      return new Response(JSON.stringify({ error: "Invalid attendee submission" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const rows = attendees.map((attendee: AttendeeInput) => ({
      purchase_id: purchaseId,
      name: (attendee.name || "").trim(),
      email: (attendee.email || "").trim(),
      phone: (attendee.phone || "").trim(),
      is_buyer: false,
      waiver_status: "pending",
    }));

    if (rows.some((row) => !row.name || !row.email)) {
      return new Response(JSON.stringify({ error: "Attendee name and email are required" }), {
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
      .from("attendees")
      .upsert(rows, { onConflict: "purchase_id,email" })
      .select("id, name, email, waiver_token");

    if (error) {
      throw error;
    }

    return new Response(JSON.stringify({ attendees: data || [] }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[submit-attendees] ERROR:", message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
