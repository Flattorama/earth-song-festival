import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

const TICKETS: Record<
  string,
  { name: string; description: string; amount: number }
> = {
  "early-bird": {
    name: "Earth Song \u2014 Early Bird Ticket",
    description:
      "Full day access (9am\u201310pm), all ceremonies & workshops, live music & performances, organic meals & refreshments, fire circle gathering, welcome gift bundle",
    amount: 29900,
  },
  "regular-admission": {
    name: "Earth Song \u2014 Regular Admission",
    description:
      "Full day access (9am\u201310pm), all ceremonies & workshops, live music & performances, organic meals & refreshments, fire circle gathering",
    amount: 33300,
  },
  "saturday-day-pass": {
    name: "Earth Song \u2014 Saturday Day Pass",
    description:
      "Saturday access (9am\u201310pm), all Saturday ceremonies & workshops, live music & performances, organic meals & refreshments",
    amount: 15000,
  },
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const {
      ticketType,
      customerEmail,
      customerName,
      customerPhone,
      customerAddress,
    } = await req.json();

    const ticket = TICKETS[ticketType];
    if (!ticket) {
      return new Response(JSON.stringify({ error: "Invalid ticket type" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      return new Response(
        JSON.stringify({ error: "Stripe is not configured" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { error: insertError } = await supabase
      .from("waiver_acceptances")
      .insert({
        attendee_name: (customerName || "").trim(),
        attendee_email: (customerEmail || "").trim(),
        attendee_phone: (customerPhone || "").trim(),
        attendee_address: (customerAddress || "").trim(),
        ticket_type: ticketType,
        waiver_version: "v1.0_2026-08-07",
      });

    if (insertError) {
      console.error("[create-checkout] Waiver insert error:", insertError);
      return new Response(
        JSON.stringify({ error: "Failed to save waiver acceptance" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const stripe = new Stripe(stripeKey);

    const origin = req.headers.get("origin") || "https://earthsongfestival.com";

    const sessionParams: Record<string, unknown> = {
      line_items: [
        {
          price_data: {
            currency: "cad",
            product_data: {
              name: ticket.name,
              description: ticket.description,
            },
            unit_amount: ticket.amount,
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${origin}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/#tickets`,
      metadata: {
        ticket_type: ticketType,
        attendee_name: customerName || "",
      },
    };

    if (customerEmail) {
      sessionParams.customer_email = customerEmail;
    }

    const session = await stripe.checkout.sessions.create(sessionParams);

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
