import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const TICKETS: Record<string, { priceId: string }> = {
  "early-bird": { priceId: "price_1T6f238aClBcVDVefxCjX29L" },
  "regular-admission": { priceId: "price_1T6f2N8aClBcVDVeL5a0jxEh" },
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { ticketType } = await req.json();

    const ticket = TICKETS[ticketType];
    if (!ticket) {
      return new Response(JSON.stringify({ error: "Invalid ticket type" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    const origin = req.headers.get("origin") || "http://localhost:5000";

    const session = await stripe.checkout.sessions.create({
      line_items: [{ price: ticket.priceId, quantity: 1 }],
      mode: "payment",
      success_url: `${origin}/payment-success`,
      cancel_url: `${origin}/#tickets`,
    });

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[create-checkout] ERROR:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
