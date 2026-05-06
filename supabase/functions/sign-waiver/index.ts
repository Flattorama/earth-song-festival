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
    const { token, legalName, email, phone } = await req.json();

    if (
      typeof token !== "string" ||
      token.length < 16 ||
      typeof legalName !== "string" ||
      typeof email !== "string"
    ) {
      return new Response(JSON.stringify({ error: "Invalid waiver submission" }), {
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
      .update({
        name: legalName.trim(),
        email: email.trim(),
        phone: typeof phone === "string" ? phone.trim() : "",
        waiver_status: "signed",
        waiver_signed_at: new Date().toISOString(),
        waiver_ip_address:
          req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "",
      })
      .eq("waiver_token", token)
      .eq("waiver_status", "pending")
      .select("id")
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (!data) {
      return new Response(JSON.stringify({ error: "Waiver not found or already signed" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[sign-waiver] ERROR:", message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
