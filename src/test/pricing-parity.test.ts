import { describe, it, expect } from "vitest";
import {
  forcedYouthPassType,
  YOUTH_AGE_BANDS,
  youthPricing,
  youthSubtotal,
  type YouthAgeBand,
  type YouthPassType,
} from "@/data/pricing";

/**
 * A copy of YOUTH_TICKETS from supabase/functions/create-checkout/index.ts,
 * in CENTS.
 *
 * It has to be duplicated: that file is a Deno module importing from esm.sh, so
 * vitest cannot load it. Duplication is the point of this test rather than a
 * flaw in it -- if create-checkout changes and this fixture is not updated to
 * match, the parity assertions below fail and the mismatch is caught here
 * instead of on a customer's card.
 */
const SERVER_YOUTH_TICKETS_CENTS: Record<string, Record<string, { label: string; amount: number }>> = {
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

/** Mirrors DAY_PASS_YOUTH_REQUIREMENT in create-checkout. */
const SERVER_DAY_PASS_YOUTH_REQUIREMENT: Record<string, string> = {
  "friday-day-pass": "friday",
  "saturday-day-pass": "day",
  "sunday-day-pass": "sunday",
};

describe("client/server youth pricing parity", () => {
  it("covers exactly the same pass types on both sides", () => {
    expect(Object.keys(youthPricing).sort()).toEqual(
      Object.keys(SERVER_YOUTH_TICKETS_CENTS).sort(),
    );
  });

  it("covers exactly the same age bands within every pass type", () => {
    for (const passType of Object.keys(youthPricing) as YouthPassType[]) {
      expect(Object.keys(youthPricing[passType].tiers).sort()).toEqual(
        Object.keys(SERVER_YOUTH_TICKETS_CENTS[passType]).sort(),
      );
    }
  });

  // The two tables are not structurally identical -- different shapes, different
  // label text, different units -- so deep equality would never hold. Convert.
  it("prices every band at dollars x 100 === cents", () => {
    for (const passType of Object.keys(youthPricing) as YouthPassType[]) {
      for (const ageBand of YOUTH_AGE_BANDS) {
        const dollars = youthPricing[passType].tiers[ageBand].amount;
        const cents = SERVER_YOUTH_TICKETS_CENTS[passType][ageBand].amount;

        expect(
          dollars * 100,
          `${passType}/${ageBand}: client shows CA$${dollars} but server charges ${cents} cents`,
        ).toBe(cents);
      }
    }
  });

  it("keeps under-2 free on both sides", () => {
    for (const passType of Object.keys(youthPricing) as YouthPassType[]) {
      expect(youthPricing[passType].tiers["under-2"].amount).toBe(0);
      expect(SERVER_YOUTH_TICKETS_CENTS[passType]["under-2"].amount).toBe(0);
    }
  });
});

describe("day pass to youth pass type mapping", () => {
  // Getting this wrong mis-prices Saturday youth tickets silently, which is why
  // it is asserted key by key rather than as one object comparison.
  it("maps friday-day-pass to the friday youth pass", () => {
    expect(forcedYouthPassType["friday-day-pass"]).toBe("friday");
    expect(SERVER_DAY_PASS_YOUTH_REQUIREMENT["friday-day-pass"]).toBe("friday");
  });

  it('maps saturday-day-pass to "day", NOT "saturday"', () => {
    expect(forcedYouthPassType["saturday-day-pass"]).toBe("day");
    expect(SERVER_DAY_PASS_YOUTH_REQUIREMENT["saturday-day-pass"]).toBe("day");
    expect(forcedYouthPassType["saturday-day-pass"]).not.toBe("saturday");
    expect(youthPricing).not.toHaveProperty("saturday");
  });

  it("maps sunday-day-pass to the sunday youth pass", () => {
    expect(forcedYouthPassType["sunday-day-pass"]).toBe("sunday");
    expect(SERVER_DAY_PASS_YOUTH_REQUIREMENT["sunday-day-pass"]).toBe("sunday");
  });

  it("agrees with the server on every day pass", () => {
    expect(forcedYouthPassType).toEqual(SERVER_DAY_PASS_YOUTH_REQUIREMENT);
  });

  it("points every day pass at a pass type that actually has prices", () => {
    for (const passType of Object.values(forcedYouthPassType)) {
      expect(youthPricing[passType]).toBeDefined();
      expect(SERVER_YOUTH_TICKETS_CENTS[passType]).toBeDefined();
    }
  });

  it("leaves weekend tickets unconstrained", () => {
    expect(forcedYouthPassType["regular-admission"]).toBeUndefined();
    expect(forcedYouthPassType["early-bird"]).toBeUndefined();
  });
});

describe("youthSubtotal", () => {
  it("is zero for no youth tickets", () => {
    expect(youthSubtotal({})).toBe(0);
    expect(youthSubtotal({ weekend: {} })).toBe(0);
  });

  it("multiplies by count and sums across bands", () => {
    // 2 x $150 + 1 x $50 = $350
    expect(youthSubtotal({ weekend: { "13-18": 2, "2-7": 1 } })).toBe(350);
  });

  it("sums across pass types", () => {
    // weekend 13-18 $150 + friday 8-12 $50 = $200
    expect(youthSubtotal({ weekend: { "13-18": 1 }, friday: { "8-12": 1 } })).toBe(200);
  });

  it("adds nothing for under-2", () => {
    expect(youthSubtotal({ weekend: { "under-2": 3 } })).toBe(0);
  });

  it("prices a Saturday 13-18 at 100, not the 75 the other day passes charge", () => {
    expect(youthSubtotal({ day: { "13-18": 1 } })).toBe(100);
    expect(youthSubtotal({ friday: { "13-18": 1 } })).toBe(75);
    expect(youthSubtotal({ sunday: { "13-18": 1 } })).toBe(75);
  });
});
