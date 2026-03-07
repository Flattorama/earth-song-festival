import Stripe from "npm:stripe@18.5.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
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

Deno.serve(async (req) => {
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

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      return new Response(JSON.stringify({ error: "Stripe is not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const stripe = new Stripe(stripeKey);

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
