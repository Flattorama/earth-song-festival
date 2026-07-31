/**
 * Youth ticket pricing, for display only.
 *
 * Amounts here are DOLLARS. The authoritative prices are in
 * `supabase/functions/create-checkout/index.ts` (`YOUTH_TICKETS`) and are held
 * in CENTS -- that function never trusts an amount sent by the browser.
 * `src/test/pricing-parity.test.ts` asserts dollars x 100 === cents so the two
 * cannot drift apart silently.
 *
 * Note the Saturday key is `day`, not `saturday`. It predates the Friday and
 * Sunday passes and is what is written to `attendees.youth_pass_type`, so
 * renaming it would mis-price Saturday youth tickets and orphan existing rows.
 */

export type YouthPassType = "weekend" | "friday" | "day" | "sunday";
export type YouthAgeBand = "13-18" | "8-12" | "2-7" | "under-2";

export interface YouthTier {
  label: string;
  /** Dollars. */
  amount: number;
}

export interface YouthPass {
  label: string;
  tiers: Record<YouthAgeBand, YouthTier>;
}

export const youthPricing: Record<YouthPassType, YouthPass> = {
  weekend: {
    label: "Full Weekend Pass",
    tiers: {
      "13-18": { label: "Ages 13–18", amount: 150 },
      "8-12": { label: "Ages 8–12", amount: 100 },
      "2-7": { label: "Ages 2–7", amount: 50 },
      "under-2": { label: "Under 2", amount: 0 },
    },
  },
  friday: {
    label: "Friday Day Pass",
    tiers: {
      "13-18": { label: "Ages 13–18", amount: 75 },
      "8-12": { label: "Ages 8–12", amount: 50 },
      "2-7": { label: "Ages 2–7", amount: 25 },
      "under-2": { label: "Under 2", amount: 0 },
    },
  },
  day: {
    label: "Saturday Day Pass",
    tiers: {
      "13-18": { label: "Ages 13–18", amount: 100 },
      "8-12": { label: "Ages 8–12", amount: 50 },
      "2-7": { label: "Ages 2–7", amount: 25 },
      "under-2": { label: "Under 2", amount: 0 },
    },
  },
  sunday: {
    label: "Sunday Day Pass",
    tiers: {
      "13-18": { label: "Ages 13–18", amount: 75 },
      "8-12": { label: "Ages 8–12", amount: 50 },
      "2-7": { label: "Ages 2–7", amount: 25 },
      "under-2": { label: "Under 2", amount: 0 },
    },
  },
};

/**
 * A day-pass adult may only add youth passes for the same day. Mirrors
 * DAY_PASS_YOUTH_REQUIREMENT in create-checkout, which enforces it server-side.
 */
export const forcedYouthPassType: Record<string, YouthPassType> = {
  "friday-day-pass": "friday",
  "saturday-day-pass": "day",
  "sunday-day-pass": "sunday",
};

export const YOUTH_AGE_BANDS: YouthAgeBand[] = ["13-18", "8-12", "2-7", "under-2"];

/** Highest count accepted per age band; create-checkout rejects anything above. */
export const MAX_YOUTH_PER_BAND = 10;

/**
 * Adults per purchase. Every adult signs their own waiver, so the buyer supplies
 * a name and email for each additional one at checkout. Larger groups contact us.
 */
export const MAX_ADULTS_PER_PURCHASE = 10;

export interface AdditionalAdult {
  name: string;
  email: string;
}

/** Counts keyed the way create-checkout expects them: { weekend: { "13-18": 2 } } */
export type YouthCounts = Partial<Record<YouthPassType, Partial<Record<YouthAgeBand, number>>>>;

export function youthSubtotal(counts: YouthCounts): number {
  let total = 0;
  for (const [passType, bands] of Object.entries(counts)) {
    for (const [ageBand, count] of Object.entries(bands ?? {})) {
      if (!count) continue;
      total +=
        youthPricing[passType as YouthPassType].tiers[ageBand as YouthAgeBand].amount * count;
    }
  }
  return total;
}
