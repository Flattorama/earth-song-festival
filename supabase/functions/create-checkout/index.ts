import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

const PRIMARY_WAIVER_VERSION = "v1.0_2026-08-07";
const MINOR_WAIVER_VERSION = "minor_v1.0_2026-08-07";

const TICKETS: Record<string, { name: string; description: string; amount: number }> = {
  "early-bird": {
    name: "Earth Song — Early Bird Ticket (Adult + babies in arms)",
    description:
      "Full weekend access, all ceremonies & workshops, live music & performances, organic meals & refreshments, fire circle gathering, welcome gift bundle. Babies in arms attend free.",
    amount: 29900,
  },
  "regular-admission": {
    name: "Earth Song — Regular Admission (Adult + babies in arms)",
    description:
      "Full weekend access, all ceremonies & workshops, live music & performances, organic meals & refreshments, fire circle gathering. Babies in arms attend free.",
    amount: 33300,
  },
  "saturday-day-pass": {
    name: "Earth Song — Saturday Day Pass",
    description:
      "Saturday access (9am–10pm), all Saturday ceremonies & workshops, live music & performances, organic meals & refreshments",
    amount: 15000,
  },
};

const YOUTH_TICKETS: Record<string, Record<string, { label: string; amount: number }>> = {
  weekend: {
    "13-18": { label: "Full Weekend Youth Pass — Ages 13–18", amount: 15000 },
    "8-12": { label: "Full Weekend Youth Pass — Ages 8–12", amount: 10000 },
    "2-7": { label: "Full Weekend Youth Pass — Ages 2–7", amount: 5000 },
    "under-2": { label: "Full Weekend Youth Pass — Under 2", amount: 0 },
  },
  day: {
    "13-18": { label: "Youth Day Pass — Ages 13–18", amount: 10000 },
    "8-12": { label: "Youth Day Pass — Ages 8–12", amount: 5000 },
    "2-7": { label: "Youth Day Pass — Ages 2–7", amount: 2500 },
    "under-2": { label: "Youth Day Pass — Under 2", amount: 0 },
  },
};

interface MinorTicketInput {
  minorName?: string;
  minorDateOfBirth?: string;
  passType?: string;
  ageBand?: string;
}

interface ValidatedMinorTicket {
  minorName: string;
  minorDateOfBirth: string;
  passType: string;
  ageBand: string;
  label: string;
  amount: number;
}

function jsonResponse(body: Record<string, unknown>, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function validateMinorTickets(ticketType: string, rawTickets: unknown): ValidatedMinorTicket[] {
  if (rawTickets === undefined) return [];
  if (!Array.isArray(rawTickets)) {
    throw new Error("Minor tickets must be submitted as a list.");
  }

  return rawTickets.map((raw) => {
    const ticket = raw as MinorTicketInput;
    const minorName = (ticket.minorName || "").trim();
    const minorDateOfBirth = (ticket.minorDateOfBirth || "").trim();
    const passType = (ticket.passType || "").trim();
    const ageBand = (ticket.ageBand || "").trim();
    const pricing = YOUTH_TICKETS[passType]?.[ageBand];

    if (!minorName || !minorDateOfBirth || !pricing) {
      throw new Error("Each minor ticket requires a name, date of birth, pass type, and age range.");
    }

    if (ticketType === "saturday-day-pass" && passType !== "day") {
      throw new Error("Saturday Day Pass adults can only add youth day passes.");
    }

    return {
      minorName,
      minorDateOfBirth,
      passType,
      ageBand,
      label: pricing.label,
      amount: pricing.amount,
    };
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
      customerPhone,
      customerAddress,
      referralCode,
      minorTickets,
      minorGuardianInitialsRisk,
      minorGuardianInitialsIndemnity,
      minorWaiverAccepted,
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
    const customerPhoneTrimmed = (customerPhone || "").trim();
    const customerAddressTrimmed = (customerAddress || "").trim();

    if (!customerNameTrimmed || !customerEmailTrimmed) {
      return jsonResponse({ error: "Name and email are required." }, 400);
    }

    const validatedMinorTickets = validateMinorTickets(ticketType, minorTickets);
    if (validatedMinorTickets.length > 0) {
      if (
        minorWaiverAccepted !== true ||
        !(minorGuardianInitialsRisk || "").trim() ||
        !(minorGuardianInitialsIndemnity || "").trim()
      ) {
        return jsonResponse({ error: "Minor waiver initials and acceptance are required." }, 400);
      }
    }

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      return jsonResponse({ error: "Stripe is not configured" }, 500);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const checkoutAttemptId = crypto.randomUUID();
    const ipAddress = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "";
    const referralCodeValue = referralCode || null;

    const { error: insertError } = await supabase
      .from("waiver_acceptances")
      .insert({
        attendee_name: customerNameTrimmed,
        attendee_email: customerEmailTrimmed,
        attendee_phone: customerPhoneTrimmed,
        attendee_address: customerAddressTrimmed,
        ticket_type: ticketType,
        waiver_version: PRIMARY_WAIVER_VERSION,
        referral_code: referralCodeValue,
        ip_address: ipAddress,
        checkout_attempt_id: checkoutAttemptId,
      });

    if (insertError) {
      console.error("[create-checkout] Waiver insert error:", insertError);
      return jsonResponse({ error: "Failed to save waiver acceptance" }, 500);
    }

    if (validatedMinorTickets.length > 0) {
      const { error: minorInsertError } = await supabase
        .from("minor_waiver_acceptances")
        .insert(
          validatedMinorTickets.map((minor) => ({
            guardian_name: customerNameTrimmed,
            guardian_email: customerEmailTrimmed,
            guardian_phone: customerPhoneTrimmed,
            guardian_address: customerAddressTrimmed,
            adult_ticket_type: ticketType,
            minor_name: minor.minorName,
            minor_date_of_birth: minor.minorDateOfBirth,
            youth_pass_type: minor.passType,
            youth_age_band: minor.ageBand,
            youth_ticket_label: minor.label,
            youth_ticket_amount: minor.amount,
            waiver_version: MINOR_WAIVER_VERSION,
            parent_initials_risk: (minorGuardianInitialsRisk || "").trim(),
            parent_initials_indemnity: (minorGuardianInitialsIndemnity || "").trim(),
            ip_address: ipAddress,
            checkout_attempt_id: checkoutAttemptId,
          }))
        );

      if (minorInsertError) {
        console.error("[create-checkout] Minor waiver insert error:", minorInsertError);
        return jsonResponse({ error: "Failed to save minor waiver acceptance" }, 500);
      }
    }

    const stripe = new Stripe(stripeKey);
    const origin = req.headers.get("origin") || "https://earthsongfestival.com";
    const paidYouthTickets = validatedMinorTickets.filter((minor) => minor.amount > 0);
    const totalTicketCount = 1 + validatedMinorTickets.length;

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
      ...paidYouthTickets.map((minor) => ({
        price_data: {
          currency: "cad",
          product_data: {
            name: `Earth Song — ${minor.label}`,
            description: `Must attend with accompanying adult: ${customerNameTrimmed}`,
          },
          unit_amount: minor.amount,
        },
        quantity: 1,
      })),
    ];

    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      line_items: lineItems,
      mode: "payment",
      payment_method_configuration: "pmc_1THRrA9YdWVK7v3DXseZCFL2",
      success_url: `${origin}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/#tickets`,
      metadata: {
        checkout_attempt_id: checkoutAttemptId,
        ticket_type: ticketType,
        adult_ticket_type: ticketType,
        adult_ticket_count: "1",
        youth_ticket_count: String(validatedMinorTickets.length),
        total_ticket_count: String(totalTicketCount),
        attendee_name: customerNameTrimmed,
        attendee_email: customerEmailTrimmed,
        attendee_phone: customerPhoneTrimmed,
        attendee_address: customerAddressTrimmed,
        referral_code: referralCode || "none",
      },
    };

    if (customerEmailTrimmed) {
      sessionParams.customer_email = customerEmailTrimmed;
    }

    const session = await stripe.checkout.sessions.create(sessionParams);

    await Promise.all([
      supabase
        .from("waiver_acceptances")
        .update({ stripe_session_id: session.id })
        .eq("checkout_attempt_id", checkoutAttemptId),
      supabase
        .from("minor_waiver_acceptances")
        .update({ stripe_session_id: session.id })
        .eq("checkout_attempt_id", checkoutAttemptId),
    ]);

    return jsonResponse({ url: session.url }, 200);
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[create-checkout] ERROR:", msg);
    return jsonResponse({ error: msg }, 500);
  }
});
