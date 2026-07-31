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

/**
 * Adults per purchase. Each additional adult travels as two Stripe metadata
 * keys, and Stripe allows 50 keys per object -- at 10 adults we use 9 x 2 = 18
 * on top of the ~10 base keys, so this cap also keeps us inside that budget.
 */
export const MAX_ADULTS_PER_PURCHASE = 10;

export interface ValidatedAdult {
  name: string;
  email: string;
}

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

/** Deliberately permissive -- we are catching typos, not policing RFC 5322. */
const EMAIL_RE = /^[^\s@]+@[^\s@.]+\.[^\s@]+$/;

/**
 * Validates the adult party.
 *
 * Every adult must sign their own waiver, so each additional adult needs a real
 * name and email -- that is who receives the link. Returns the additional adults
 * only; the buyer is handled separately from the top-level name/email.
 *
 * The uniqueness rule is load-bearing, not tidiness: `attendees` carries
 * UNIQUE (purchase_id, email), so two identical addresses would collapse into
 * one row and we would sell three tickets while tracking two adults.
 */
export function validateAdults(
  rawQuantity: unknown,
  rawAdults: unknown,
  buyerEmail: string,
): ValidatedAdult[] {
  const quantity = rawQuantity === undefined || rawQuantity === null ? 1 : rawQuantity;

  if (typeof quantity !== "number" || !Number.isInteger(quantity)) {
    throw new Error("Adult ticket quantity must be a whole number.");
  }
  if (quantity < 1 || quantity > MAX_ADULTS_PER_PURCHASE) {
    throw new Error(
      `Adult ticket quantity must be between 1 and ${MAX_ADULTS_PER_PURCHASE}. For larger groups, please contact us.`,
    );
  }

  const expected = quantity - 1;
  const list = rawAdults === undefined || rawAdults === null ? [] : rawAdults;

  if (!Array.isArray(list)) {
    throw new Error("Additional adults must be submitted as a list.");
  }
  if (list.length !== expected) {
    throw new Error(
      `Expected details for ${expected} additional adult${expected === 1 ? "" : "s"}, received ${list.length}.`,
    );
  }

  const seen = new Set<string>([buyerEmail.trim().toLowerCase()]);
  const adults: ValidatedAdult[] = [];

  list.forEach((raw, index) => {
    const position = index + 2; // adult 1 is the buyer
    const entry = (raw ?? {}) as { name?: unknown; email?: unknown };
    const name = typeof entry.name === "string" ? entry.name.trim() : "";
    const email = typeof entry.email === "string" ? entry.email.trim() : "";

    if (!name) {
      throw new Error(`Please enter a name for adult ${position}.`);
    }
    if (!email || !EMAIL_RE.test(email)) {
      throw new Error(`Please enter a valid email for adult ${position}.`);
    }

    const key = email.toLowerCase();
    if (seen.has(key)) {
      throw new Error(
        `Each adult needs their own email address. ${email} is used more than once.`,
      );
    }
    seen.add(key);

    adults.push({ name, email });
  });

  return adults;
}

/**
 * Additional adults ride along as one key pair each rather than a single packed
 * value. Stripe caps a metadata value at 500 characters, and truncating a packed
 * string would silently drop an adult -- losing a person is worse than any
 * verbosity here.
 */
export function buildAdultMetadata(adults: ValidatedAdult[]): Record<string, string> {
  const meta: Record<string, string> = {};
  adults.forEach((adult, index) => {
    const position = index + 2;
    meta[`adult_${position}_name`] = adult.name.slice(0, STRIPE_METADATA_VALUE_LIMIT);
    meta[`adult_${position}_email`] = adult.email.slice(0, STRIPE_METADATA_VALUE_LIMIT);
  });
  return meta;
}

// The reader for these keys lives in stripe-webhook/adults.ts. Edge functions in
// this repo are self-contained -- none import across function directories -- so
// the two sides are kept honest by a round-trip test
// (src/test/adult-metadata-contract.test.ts) rather than a shared module.

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
