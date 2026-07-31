// Ticket catalog, youth pricing and input validation for create-checkout.
//
// AUTHORITATIVE PRICES. Amounts are in CENTS. The browser's copy
// (src/data/pricing.ts) is display-only and holds dollars; src/test/pricing-parity.test.ts
// imports both and asserts dollars x 100 === cents.
//
// Deliberately free of Deno globals, URL imports and network calls so vitest can
// import it directly. Keep it that way -- if this file starts importing Stripe
// or esm.sh, the tests can no longer verify the real validation and would have
// to fall back to duplicating it.

export interface TicketDefinition {
  name: string;
  description: string;
  /** Cents. */
  amount: number;
}

export interface YouthTier {
  label: string;
  /** Cents. */
  amount: number;
}

export interface ValidatedYouthLine {
  passType: string;
  ageBand: string;
  label: string;
  /** Cents, per ticket. Always read from YOUTH_TICKETS, never from the client. */
  amount: number;
  count: number;
}

// Stripe rejects any metadata value over 500 characters.
export const STRIPE_METADATA_VALUE_LIMIT = 500;

// Guards against a fat-fingered or hostile counter. Larger parties should
// contact us rather than self-serve.
export const MAX_YOUTH_PER_BAND = 10;

export const EARLY_BIRD_CUTOFF = "2026-05-06T03:59:59Z";

export const TICKETS: Record<string, TicketDefinition> = {
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

export const YOUTH_TICKETS: Record<string, Record<string, YouthTier>> = {
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
  // Saturday's key is "day", not "saturday". It predates the Friday and Sunday
  // passes and is what gets written to attendees.youth_pass_type, so renaming it
  // would mis-price Saturday youth tickets and orphan existing rows.
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

/** Day-pass adults may only add youth passes for the same day. */
export const DAY_PASS_YOUTH_REQUIREMENT: Record<string, string> = {
  "friday-day-pass": "friday",
  "saturday-day-pass": "day",
  "sunday-day-pass": "sunday",
};

export function isEarlyBirdExpired(now: Date): boolean {
  return now >= new Date(EARLY_BIRD_CUTOFF);
}

/**
 * Turns `{ weekend: { "13-18": 2 } }` into priced line data.
 *
 * Names and dates of birth are no longer collected here -- they belong on the
 * Smartwaiver form. Prices come only from YOUTH_TICKETS; a client-supplied
 * amount is ignored entirely because it is never read.
 */
export function validateYouthCounts(
  ticketType: string,
  rawCounts: unknown,
): ValidatedYouthLine[] {
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
export function buildYouthBandsMetadata(lines: ValidatedYouthLine[]): string {
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
