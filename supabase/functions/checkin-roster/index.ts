// Registration-desk roster for festival day.
//
// Returns one row per EXPECTED PERSON (not per purchase), flattened and
// pre-joined so the gate tablet needs zero client-side reasoning and can cache
// the whole payload for offline use.
//
// Auth: x-checkin-token header, compared against the CHECKIN_TOKEN secret.
// Deploy with --no-verify-jwt.
//
// Required secrets:
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY  (auto-provided)
//   CHECKIN_TOKEN   - shared secret handed to gate volunteers

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey, X-Checkin-Token",
};

const TICKET_LABELS: Record<string, string> = {
  "early-bird": "Early Bird (weekend)",
  "regular-admission": "Regular (weekend)",
  "friday-day-pass": "Friday day pass",
  "saturday-day-pass": "Saturday day pass",
  "sunday-day-pass": "Sunday day pass",
};

interface AttendeeRow {
  id: string;
  purchase_id: string;
  name: string;
  email: string;
  phone: string | null;
  is_buyer: boolean;
  is_minor: boolean | null;
  waiver_status: string;
  waiver_signed_at: string | null;
  smartwaiver_id: string | null;
  checked_in_at: string | null;
  created_at: string;
}

interface PurchaseRow {
  id: string;
  buyer_name: string;
  buyer_email: string;
  ticket_type: string;
  adult_ticket_type: string | null;
  adult_ticket_count: number | null;
  youth_ticket_count: number | null;
  total_ticket_count: number | null;
  created_at: string;
}

function json(body: Record<string, unknown>, status: number) {
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
    const expected = Deno.env.get("CHECKIN_TOKEN");
    const provided = req.headers.get("x-checkin-token");

    if (!expected || provided !== expected) {
      return json({ error: "Unauthorized" }, 403);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !supabaseServiceKey) {
      return json({ error: "Supabase is not configured" }, 500);
    }

    const { createClient } = await import(
      "https://esm.sh/@supabase/supabase-js@2.49.4"
    );
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const [attendeesRes, purchasesRes, legacyMinorsRes] = await Promise.all([
      supabase
        .from("attendees")
        .select(
          "id, purchase_id, name, email, phone, is_buyer, is_minor, waiver_status, waiver_signed_at, smartwaiver_id, checked_in_at, created_at",
        )
        .order("name", { ascending: true }),
      supabase
        .from("purchases")
        .select(
          "id, buyer_name, buyer_email, ticket_type, adult_ticket_type, adult_ticket_count, youth_ticket_count, total_ticket_count, created_at",
        ),
      // Legacy minors declared under the pre-Aug-2026 checkout flow. Shown at
      // the desk so staff know which kids to expect with which guardian.
      supabase
        .from("minor_waiver_acceptances")
        .select("purchase_id, minor_name, minor_date_of_birth, youth_ticket_label"),
    ]);

    if (attendeesRes.error) throw attendeesRes.error;
    if (purchasesRes.error) throw purchasesRes.error;

    const attendees = (attendeesRes.data || []) as AttendeeRow[];
    const purchases = (purchasesRes.data || []) as PurchaseRow[];
    const legacyMinors = legacyMinorsRes.error ? [] : legacyMinorsRes.data || [];

    const purchaseById = new Map(purchases.map((p) => [p.id, p]));

    const minorsByPurchase = new Map<string, string[]>();
    for (const m of legacyMinors as Array<{ purchase_id: string | null; minor_name: string }>) {
      if (!m.purchase_id) continue;
      const list = minorsByPurchase.get(m.purchase_id) || [];
      list.push(m.minor_name);
      minorsByPurchase.set(m.purchase_id, list);
    }

    // Group attendees by purchase so the desk can serve a whole party at once.
    const partyByPurchase = new Map<string, AttendeeRow[]>();
    for (const a of attendees) {
      const list = partyByPurchase.get(a.purchase_id) || [];
      list.push(a);
      partyByPurchase.set(a.purchase_id, list);
    }

    const roster = attendees.map((a) => {
      const p = purchaseById.get(a.purchase_id);
      const party = partyByPurchase.get(a.purchase_id) || [];
      const expectedTotal = p?.total_ticket_count ?? 1;
      const youthCount = p?.youth_ticket_count ?? 0;
      const ticketType = p?.adult_ticket_type || p?.ticket_type || "";

      // Shortfall is measured in ADULTS only, and counted against adult
      // attendee rows. Minors signed onto a guardian's waiver become their own
      // attendee rows, so a naive party.length comparison would quietly clamp
      // every real shortfall to zero once that lands.
      const adultsExpected = Math.max(expectedTotal - youthCount, 1);
      const adultRecords = party.filter((row) => !row.is_minor).length;

      return {
        id: a.id,
        purchaseId: a.purchase_id,
        name: a.name || p?.buyer_name || "(no name)",
        email: a.email || p?.buyer_email || "",
        phone: a.phone || "",
        isBuyer: a.is_buyer,
        isMinor: !!a.is_minor,
        waiverStatus: a.waiver_status,
        waiverSignedAt: a.waiver_signed_at,
        smartwaiverId: a.smartwaiver_id,
        checkedInAt: a.checked_in_at,
        ticketType,
        ticketLabel: TICKET_LABELS[ticketType] || ticketType || "Unknown ticket",
        youthCount,
        // How many adults this purchase paid for vs. how many we have records
        // for. A shortfall means someone bought for friends who never signed.
        partySize: party.length,
        adultsExpected,
        adultRecords,
        expectedTotal,
        partyShortfall: Math.max(adultsExpected - adultRecords, 0),
        legacyMinors: minorsByPurchase.get(a.purchase_id) || [],
        purchasedAt: p?.created_at || a.created_at,
      };
    });

    const signed = roster.filter((r) => r.waiverStatus === "signed").length;
    const checkedIn = roster.filter((r) => r.checkedInAt).length;

    return json(
      {
        generatedAt: new Date().toISOString(),
        totals: {
          people: roster.length,
          signed,
          pending: roster.length - signed,
          checkedIn,
          purchases: purchases.length,
          youthTickets: purchases.reduce(
            (sum, p) => sum + (p.youth_ticket_count || 0),
            0,
          ),
          expectedHeadcount: purchases.reduce(
            (sum, p) => sum + (p.total_ticket_count || 1),
            0,
          ),
        },
        roster,
      },
      200,
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[checkin-roster] ERROR:", message);
    return json({ error: message }, 500);
  }
});
