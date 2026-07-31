// Creates the Stripe Checkout session.
//
// The waiver is no longer collected here. Stripe takes payment and contact
// details; stripe-webhook then triggers send-waiver-email, and the participant
// signs on Smartwaiver. This function therefore writes nothing to Supabase.

import Stripe from "https://esm.sh/stripe@18.5.0";

import {
  buildAdultMetadata,
  buildYouthBandsMetadata,
  isEarlyBirdExpired,
  TICKETS,
  validateAdults,
  validateYouthCounts,
} from "./catalog.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

function jsonResponse(body: Record<string, unknown>, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const {
      ticketType,
      customerEmail,
      customerName,
      referralCode,
      youthCounts,
      adultQuantity,
      additionalAdults,
    } = await req.json();

    const ticket = TICKETS[ticketType];
    if (!ticket) {
      return jsonResponse({ error: "Invalid ticket type" }, 400);
    }

    if (ticketType === "early-bird" && isEarlyBirdExpired(new Date())) {
      return jsonResponse({ error: "Early Bird tickets are no longer available." }, 400);
    }

    const customerNameTrimmed = (customerName || "").trim();
    const customerEmailTrimmed = (customerEmail || "").trim();

    if (!customerNameTrimmed || !customerEmailTrimmed) {
      return jsonResponse({ error: "Name and email are required." }, 400);
    }

    const validatedYouth = validateYouthCounts(ticketType, youthCounts);
    const validatedAdults = validateAdults(
      adultQuantity,
      additionalAdults,
      customerEmailTrimmed,
    );
    const adultTicketCount = validatedAdults.length + 1; // the buyer

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      return jsonResponse({ error: "Stripe is not configured" }, 500);
    }

    const stripe = new Stripe(stripeKey);
    const origin = req.headers.get("origin") || "https://earthsongfestival.com";
    const youthTicketCount = validatedYouth.reduce((sum, line) => sum + line.count, 0);
    const totalTicketCount = adultTicketCount + youthTicketCount;

    const lineItems = [
      {
        price_data: {
          currency: "cad",
          product_data: {
            name: ticket.name,
            description: ticket.description,
          },
          unit_amount: ticket.amount,
        },
        quantity: adultTicketCount,
      },
      // Free bands (under 2) are counted in the metadata but never sent to
      // Stripe -- a zero-amount line item would be rejected.
      ...validatedYouth
        .filter((line) => line.amount > 0)
        .map((line) => ({
          price_data: {
            currency: "cad",
            product_data: {
              name: `Earth Song — ${line.label}`,
              description: `Must attend with accompanying adult: ${customerNameTrimmed}`,
            },
            unit_amount: line.amount,
          },
          quantity: line.count,
        })),
    ];

    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      line_items: lineItems,
      mode: "payment",
      allow_promotion_codes: true,
      // Leave this alone: it is what enables Klarna and Afterpay, which the
      // ticket cards advertise.
      payment_method_configuration: "pmc_1THRrA9YdWVK7v3DXseZCFL2",
      // stripe-webhook returns early unless the session carries a customer, so
      // this keeps purchases from slipping past unrecorded.
      customer_creation: "always",
      phone_number_collection: { enabled: true },
      custom_text: {
        submit: {
          message:
            "After payment, check your email — every adult attendee must sign a liability waiver before entering the festival.",
        },
      },
      success_url: `${origin}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/#tickets`,
      metadata: {
        ticket_type: ticketType,
        adult_ticket_type: ticketType,
        adult_ticket_count: String(adultTicketCount),
        youth_ticket_count: String(youthTicketCount),
        total_ticket_count: String(totalTicketCount),
        youth_bands: buildYouthBandsMetadata(validatedYouth),
        attendee_name: customerNameTrimmed,
        attendee_email: customerEmailTrimmed,
        referral_code: referralCode || "none",
        // One key pair per additional adult. stripe-webhook turns these into
        // attendee rows so each person gets their own waiver link.
        ...buildAdultMetadata(validatedAdults),
      },
    };

    if (customerEmailTrimmed) {
      sessionParams.customer_email = customerEmailTrimmed;
    }

    const session = await stripe.checkout.sessions.create(sessionParams);

    return jsonResponse({ url: session.url }, 200);
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[create-checkout] ERROR:", msg);
    return jsonResponse({ error: msg }, 500);
  }
});
