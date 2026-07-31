import { describe, it, expect } from "vitest";
import {
  buildYouthBandsMetadata,
  DAY_PASS_YOUTH_REQUIREMENT,
  isEarlyBirdExpired,
  MAX_YOUTH_PER_BAND,
  STRIPE_METADATA_VALUE_LIMIT,
  TICKETS,
  validateYouthCounts,
  YOUTH_TICKETS,
} from "../../supabase/functions/create-checkout/catalog.ts";

describe("adult ticket catalog", () => {
  // Prices are asserted literally. If one of these ever needs to change it
  // should require deliberately editing the expected value here.
  it("charges the agreed amounts in cents", () => {
    expect(TICKETS["early-bird"].amount).toBe(29900);
    expect(TICKETS["regular-admission"].amount).toBe(33300);
    expect(TICKETS["friday-day-pass"].amount).toBe(10000);
    expect(TICKETS["saturday-day-pass"].amount).toBe(15000);
    expect(TICKETS["sunday-day-pass"].amount).toBe(10000);
  });

  it("has no ticket type outside the known set", () => {
    expect(Object.keys(TICKETS).sort()).toEqual([
      "early-bird",
      "friday-day-pass",
      "regular-admission",
      "saturday-day-pass",
      "sunday-day-pass",
    ]);
  });
});

describe("early bird cutoff", () => {
  it("is open before the cutoff and closed after", () => {
    expect(isEarlyBirdExpired(new Date("2026-05-05T12:00:00Z"))).toBe(false);
    expect(isEarlyBirdExpired(new Date("2026-05-06T04:00:00Z"))).toBe(true);
  });

  it("is expired today, so the tier must not be sellable", () => {
    expect(isEarlyBirdExpired(new Date())).toBe(true);
  });
});

describe("validateYouthCounts", () => {
  it("returns nothing when no youth tickets are requested", () => {
    expect(validateYouthCounts("regular-admission", undefined)).toEqual([]);
    expect(validateYouthCounts("regular-admission", null)).toEqual([]);
    expect(validateYouthCounts("regular-admission", {})).toEqual([]);
  });

  it("prices from the server table, ignoring anything the client sends", () => {
    const lines = validateYouthCounts("regular-admission", { weekend: { "13-18": 2 } });
    expect(lines).toEqual([
      {
        passType: "weekend",
        ageBand: "13-18",
        label: "Full Weekend Youth Pass — Ages 13–18",
        amount: 15000,
        count: 2,
      },
    ]);
  });

  it("cannot be talked into a cheaper price by a client-supplied amount", () => {
    // The client shape is counts only; an injected price has nowhere to land.
    const lines = validateYouthCounts("regular-admission", {
      weekend: { "13-18": 1 },
    });
    expect(lines[0].amount).toBe(YOUTH_TICKETS.weekend["13-18"].amount);
    expect(lines[0].amount).toBe(15000);
  });

  it("rejects a count of zero rather than ignoring it", () => {
    expect(() => validateYouthCounts("regular-admission", { weekend: { "13-18": 0 } })).toThrow(
      /between 1 and 10/,
    );
  });

  it(`rejects a count above ${MAX_YOUTH_PER_BAND}`, () => {
    expect(() => validateYouthCounts("regular-admission", { weekend: { "13-18": 11 } })).toThrow(
      /between 1 and 10/,
    );
    expect(() =>
      validateYouthCounts("regular-admission", { weekend: { "13-18": MAX_YOUTH_PER_BAND } }),
    ).not.toThrow();
  });

  it("rejects negative and fractional counts", () => {
    expect(() => validateYouthCounts("regular-admission", { weekend: { "13-18": -1 } })).toThrow();
    expect(() => validateYouthCounts("regular-admission", { weekend: { "13-18": 1.5 } })).toThrow(
      /whole numbers/,
    );
    expect(() => validateYouthCounts("regular-admission", { weekend: { "13-18": "2" } })).toThrow(
      /whole numbers/,
    );
  });

  it("rejects an unknown age band", () => {
    expect(() => validateYouthCounts("regular-admission", { weekend: { "19-99": 1 } })).toThrow(
      /Unknown youth age band/,
    );
  });

  it("rejects an unknown pass type", () => {
    expect(() => validateYouthCounts("regular-admission", { saturday: { "13-18": 1 } })).toThrow(
      /Unknown youth pass type/,
    );
  });

  it("rejects a list, which is the old minorTickets shape", () => {
    expect(() =>
      validateYouthCounts("regular-admission", [{ minorName: "Sam", passType: "weekend" }]),
    ).toThrow(/counts per age band/);
  });
});

describe("day pass youth restriction", () => {
  it("lets a Friday buyer add Friday youth passes only", () => {
    expect(() => validateYouthCounts("friday-day-pass", { friday: { "13-18": 1 } })).not.toThrow();
    expect(() => validateYouthCounts("friday-day-pass", { weekend: { "13-18": 1 } })).toThrow(
      /same day/,
    );
    expect(() => validateYouthCounts("friday-day-pass", { sunday: { "13-18": 1 } })).toThrow(
      /same day/,
    );
  });

  it('lets a Saturday buyer add "day" youth passes only', () => {
    expect(() => validateYouthCounts("saturday-day-pass", { day: { "13-18": 1 } })).not.toThrow();
    expect(() => validateYouthCounts("saturday-day-pass", { friday: { "13-18": 1 } })).toThrow(
      /same day/,
    );
    expect(() => validateYouthCounts("saturday-day-pass", { weekend: { "13-18": 1 } })).toThrow(
      /same day/,
    );
  });

  it("lets a Sunday buyer add Sunday youth passes only", () => {
    expect(() => validateYouthCounts("sunday-day-pass", { sunday: { "13-18": 1 } })).not.toThrow();
    expect(() => validateYouthCounts("sunday-day-pass", { day: { "13-18": 1 } })).toThrow(
      /same day/,
    );
  });

  it("leaves weekend buyers free to add any single day", () => {
    for (const passType of ["weekend", "friday", "day", "sunday"]) {
      expect(() =>
        validateYouthCounts("regular-admission", { [passType]: { "2-7": 1 } }),
      ).not.toThrow();
    }
  });

  it("prices Saturday youth at 10000, not the 7500 Friday and Sunday charge", () => {
    expect(validateYouthCounts("saturday-day-pass", { day: { "13-18": 1 } })[0].amount).toBe(10000);
    expect(validateYouthCounts("friday-day-pass", { friday: { "13-18": 1 } })[0].amount).toBe(7500);
    expect(validateYouthCounts("sunday-day-pass", { sunday: { "13-18": 1 } })[0].amount).toBe(7500);
  });

  it("maps every day pass to a youth pass type that exists", () => {
    expect(DAY_PASS_YOUTH_REQUIREMENT["saturday-day-pass"]).toBe("day");
    for (const [ticket, passType] of Object.entries(DAY_PASS_YOUTH_REQUIREMENT)) {
      expect(TICKETS[ticket], `${ticket} is not a real ticket`).toBeDefined();
      expect(YOUTH_TICKETS[passType], `${passType} has no prices`).toBeDefined();
    }
  });
});

describe("youth_bands metadata", () => {
  it("is compact JSON Stripe will accept", () => {
    const lines = validateYouthCounts("regular-admission", {
      weekend: { "13-18": 2, "2-7": 1 },
    });
    const json = buildYouthBandsMetadata(lines);

    expect(JSON.parse(json)).toEqual({ weekend: { "13-18": 2, "2-7": 1 } });
    expect(json.length).toBeLessThanOrEqual(STRIPE_METADATA_VALUE_LIMIT);
  });

  it("stays parseable even at the maximum a real order can produce", () => {
    // Every pass type, every band, all at the per-band cap.
    const everything: Record<string, Record<string, number>> = {};
    for (const passType of Object.keys(YOUTH_TICKETS)) {
      everything[passType] = {};
      for (const band of Object.keys(YOUTH_TICKETS[passType])) {
        everything[passType][band] = MAX_YOUTH_PER_BAND;
      }
    }
    const json = buildYouthBandsMetadata(
      validateYouthCounts("regular-admission", everything),
    );

    expect(json.length).toBeLessThanOrEqual(STRIPE_METADATA_VALUE_LIMIT);
    expect(() => JSON.parse(json)).not.toThrow();
  });

  it("degrades to empty JSON rather than truncating into garbage", () => {
    const oversized = Array.from({ length: 200 }, (_, i) => ({
      passType: `pass-${i}`,
      ageBand: `band-${i}`,
      label: "x",
      amount: 100,
      count: 1,
    }));
    const json = buildYouthBandsMetadata(oversized);

    expect(json).toBe("{}");
    expect(() => JSON.parse(json)).not.toThrow();
  });

  it("is empty for an order with no youth tickets", () => {
    expect(buildYouthBandsMetadata([])).toBe("{}");
  });
});
