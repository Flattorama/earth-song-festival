// Creates the Stripe Checkout session.
//
// The waiver is no longer collected here. Stripe takes payment and contact
// details; stripe-webhook then triggers send-waiver-email, and the participant
// signs on Smartwaiver. This function therefore writes nothing to Supabase.

import Stripe from "https://esm.sh/stripe@18.5.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

// Stripe rejects any metadata value over 500 characters.
const STRIPE_METADATA_VALUE_LIMIT = 500;

// Guards against a fat-fingered or hostile counter. Larger parties should
// contact us rather than self-serve.
const MAX_YOUTH_PER_BAND = 10;

const TICKETS: Record<string, { name: string; description: string; amount: number }> = {
  "early-bird": {
    name: "Earth Song — Early Bird Ticket (Adult + babies in arms)",
    description:
      "Full weekend access, all ceremonies & workshops, live music & performances, organic meals & refreshments available for purchase, fire circle gathering, welcome gift bundle. Babies in arms attend free.",
    amount: 29900,
  },
  "regular-admission": {
    name: "Earth Song — Regular Admission (Adult + babies in arms)",
    description:
      "Full weekend access, all ceremonies & workshops, live music & performances, organic meals & refreshments available for purchase, fire circle gathering. Babies in arms attend free.",
    amount: 33300,
  },
  "friday-day-pass": {
    name: "Earth Song — Friday Day Pass",
    description:
      "Friday access (3pm–late), opening ceremony & fire circle, all Friday workshops & performances, organic meals & refreshments available for purchase",
    amount: 10000,
  },
  "saturday-day-pass": {
    name: "Earth Song — Saturday Day Pass",
    description:
      "Saturday access (9am–10pm), all Saturday ceremonies & workshops, live music & performances, organic meals & refreshments available for purchase",
    amount: 15000,
  },
  "sunday-day-pass": {
    name: "Earth Song — Sunday Day Pass",
    description:
      "Sunday access (7am–4pm), all Sunday ceremonies & workshops, closing ceremony, organic meals & refreshments available for purchase",
    amount: 10000,
  },
};

const YOUTH_TICKETS: Record<string, Record<string, { label: string; amount: number }>> = {
  weekend: {
    "13-18": { label: "Full Weekend Youth Pass — Ages 13–18", amount: 15000 },
    "8-12": { label: "Full Weekend Youth Pass — Ages 8–12", amount: 10000 },
    "2-7": { label: "Full Weekend Youth Pass — Ages 2–7", amount: 5000 },
    "under-2": { label: "Full Weekend Youth Pass — Under 2", amount: 0 },
  },
  friday: {
    "13-18": { label: "Friday Youth Day Pass — Ages 13–18", amount: 7500 },
    "8-12": { label: "Friday Youth Day Pass — Ages 8–12", amount: 5000 },
    "2-7": { label: "Friday Youth Day Pass — Ages 2–7", amount: 2500 },
    "under-2": { label: "Friday Youth Day Pass — Under 2", amount: 0 },
  },
  day: {
    "13-18": { label: "Saturday Youth Day Pass — Ages 13–18", amount: 10000 },
    "8-12": { label: "Saturday Youth Day Pass — Ages 8–12", amount: 5000 },
    "2-7": { label: "Saturday Youth Day Pass — Ages 2–7", amount: 2500 },
    "under-2": { label: "Saturday Youth Day Pass — Under 2", amount: 0 },
  },
  sunday: {
    "13-18": { label: "Sunday Youth Day Pass — Ages 13–18", amount: 7500 },
    "8-12": { label: "Sunday Youth Day Pass — Ages 8–12", amount: 5000 },
    "2-7": { label: "Sunday Youth Day Pass — Ages 2–7", amount: 2500 },
    "under-2": { label: "Sunday Youth Day Pass — Under 2", amount: 0 },
  },
};

// Day-pass adults may only add youth passes for the same day.
const DAY_PASS_YOUTH_REQUIREMENT: Record<string, string> = {
  "friday-day-pass": "friday",
  "saturday-day-pass": "day",
  "sunday-day-pass": "sunday",
};

interface ValidatedYouthLine {
  passType: string;
  ageBand: string;
  label: string;
  /** Cents, per ticket. Always read from YOUTH_TICKETS, never from the client. */
  amount: number;
  count: number;
}

function jsonResponse(body: Record<string, unknown>, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

/**
 * Turns `{ weekend: { "13-18": 2 } }` into priced line data.
 *
 * Names and dates of birth are no longer collected here -- they belong on the
 * Smartwaiver form. Prices come only from YOUTH_TICKETS; a client-supplied
 * amount is ignored entirely because it is never read.
 */
function validateYouthCounts(ticketType: string, rawCounts: unknown): ValidatedYouthLine[] {
  if (rawCounts === undefined || rawCounts === null) return [];
  if (typeof rawCounts !== "object" || Array.isArray(rawCounts)) {
    throw new Error("Youth tickets must be submitted as counts per age band.");
  }

  const requiredYouthPass = DAY_PASS_YOUTH_REQUIREMENT[ticketType];
  const lines: ValidatedYouthLine[] = [];

  for (const [passType, rawBands] of Object.entries(rawCounts as Record<string, unknown>)) {
    const bandPricing = YOUTH_TICKETS[passType];
    if (!bandPricing) {
      throw new Error(`Unknown youth pass type: ${passType}`);
    }
    if (requiredYouthPass && passType !== requiredYouthPass) {
      throw new Error("Day pass adults can only add youth passes for the same day.");
    }
    if (typeof rawBands !== "object" || rawBands === null || Array.isArray(rawBands)) {
      throw new Error("Youth counts must be an object of age bands.");
    }

    for (const [ageBand, rawCount] of Object.entries(rawBands as Record<string, unknown>)) {
      const pricing = bandPricing[ageBand];
      if (!pricing) {
        throw new Error(`Unknown youth age band: ${ageBand}`);
      }
      if (typeof rawCount !== "number" || !Number.isInteger(rawCount)) {
        throw new Error("Youth ticket counts must be whole numbers.");
      }
      if (rawCount < 1 || rawCount > MAX_YOUTH_PER_BAND) {
        throw new Error(
          `Youth ticket counts must be between 1 and ${MAX_YOUTH_PER_BAND}. Omit a band instead of sending zero.`,
        );
      }

      lines.push({
        passType,
        ageBand,
        label: pricing.label,
        amount: pricing.amount,
        count: rawCount,
      });
    }
  }

  return lines;
}

/** Compact `{"weekend":{"13-18":2}}` for Stripe metadata, which caps at 500 chars. */
function buildYouthBandsMetadata(lines: ValidatedYouthLine[]): string {
  const bands: Record<string, Record<string, number>> = {};
  for (const line of lines) {
    bands[line.passType] = bands[line.passType] || {};
    bands[line.passType][line.ageBand] = line.count;
  }

  const json = JSON.stringify(bands);
  if (json.length <= STRIPE_METADATA_VALUE_LIMIT) return json;

  // Truncating would produce unparseable JSON, so drop it rather than corrupt
  // it. The line items on the session remain the source of truth.
  console.error(`[create-checkout] youth_bands too long (${json.length} chars); omitting`);
  return "{}";
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
    } = await req.json();

    const ticket = TICKETS[ticketType];
    if (!ticket) {
      return jsonResponse({ error: "Invalid ticket type" }, 400);
    }

    if (ticketType === "early-bird" && new Date() >= new Date("2026-05-06T03:59:59Z")) {
      return jsonResponse({ error: "Early Bird tickets are no longer available." }, 400);
    }

    const customerNameTrimmed = (customerName || "").trim();
    const customerEmailTrimmed = (customerEmail || "").trim();

    if (!customerNameTrimmed || !customerEmailTrimmed) {
      return jsonResponse({ error: "Name and email are required." }, 400);
    }

    const validatedYouth = validateYouthCounts(ticketType, youthCounts);

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      return jsonResponse({ error: "Stripe is not configured" }, 500);
    }

    const stripe = new Stripe(stripeKey);
    const origin = req.headers.get("origin") || "https://earthsongfestival.com";
    const youthTicketCount = validatedYouth.reduce((sum, line) => sum + line.count, 0);
    const totalTicketCount = 1 + youthTicketCount;

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
        quantity: 1,
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
        adult_ticket_count: "1",
        youth_ticket_count: String(youthTicketCount),
        total_ticket_count: String(totalTicketCount),
        youth_bands: buildYouthBandsMetadata(validatedYouth),
        attendee_name: customerNameTrimmed,
        attendee_email: customerEmailTrimmed,
        referral_code: referralCode || "none",
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
