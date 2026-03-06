import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const TICKETS: Record<string, { name: string; description: string; amount: number }> = {
  "early-bird": {
    name: "Earth Song — Early Bird Ticket",
    description:
      "Full day access (9am–10pm), all ceremonies & workshops, live music & performances, organic meals & refreshments, fire circle gathering, welcome gift bundle",
    amount: 29900, // $299.00 CAD in cents
  },
  "regular-admission": {
    name: "Earth Song — Regular Admission",
    description:
      "Full day access (9am–10pm), all ceremonies & workshops, live music & performances, organic meals & refreshments, fire circle gathering",
    amount: 33300, // $333.00 CAD in cents
  },
  "saturday-day-pass": {
    name: "Earth Song — Saturday Day Pass",
    description:
      "Saturday access (9am–10pm), all Saturday ceremonies & workshops, live music & performances, organic meals & refreshments",
    amount: 15000, // $150.00 CAD in cents
  },
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { ticketType, customerEmail, customerName } = await req.json();

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
      success_url: `${origin}/payment-success`,
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
