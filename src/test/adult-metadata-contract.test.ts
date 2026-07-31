import { describe, it, expect } from "vitest";
import {
  buildAdultMetadata,
  MAX_ADULTS_PER_PURCHASE,
  STRIPE_METADATA_VALUE_LIMIT,
  validateAdults,
} from "../../supabase/functions/create-checkout/catalog.ts";
import {
  parseAdultMetadata,
  placeholderAdultEmail,
} from "../../supabase/functions/stripe-webhook/adults.ts";

/**
 * The writer lives in create-checkout and the reader in stripe-webhook, because
 * edge functions in this repo are self-contained and none import across function
 * directories. This file is what stops the two halves drifting: it runs the real
 * writer against the real reader over the same Stripe metadata bag they use in
 * production. Rename a key on one side and these fail.
 */
describe("adult metadata round trip", () => {
  it("survives the trip through Stripe metadata unchanged", () => {
    const adults = [
      { name: "Ada Lovelace", email: "ada@example.com" },
      { name: "Alan Turing", email: "alan@example.com" },
    ];

    const metadata = buildAdultMetadata(adults);
    expect(parseAdultMetadata(metadata, 3)).toEqual(adults);
  });

  it("uses the key names the reader looks for", () => {
    const metadata = buildAdultMetadata([{ name: "Ada", email: "ada@example.com" }]);
    expect(Object.keys(metadata).sort()).toEqual(["adult_2_email", "adult_2_name"]);
  });

  it("writes nothing for a solo buyer", () => {
    expect(buildAdultMetadata([])).toEqual({});
    expect(parseAdultMetadata({}, 1)).toEqual([]);
  });

  it("stays inside Stripe's 50-key budget at the maximum party size", () => {
    const adults = Array.from({ length: MAX_ADULTS_PER_PURCHASE - 1 }, (_, i) => ({
      name: `Adult ${i + 2}`,
      email: `adult${i + 2}@example.com`,
    }));
    const metadata = buildAdultMetadata(adults);

    // 9 additional adults x 2 keys, plus ~10 base keys, must stay under 50.
    expect(Object.keys(metadata)).toHaveLength(18);
    expect(Object.keys(metadata).length + 12).toBeLessThan(50);
    for (const value of Object.values(metadata)) {
      expect(value.length).toBeLessThanOrEqual(STRIPE_METADATA_VALUE_LIMIT);
    }
    expect(parseAdultMetadata(metadata, MAX_ADULTS_PER_PURCHASE)).toEqual(adults);
  });

  it("skips an adult whose email is missing rather than inventing one", () => {
    // The webhook substitutes a placeholder for these, so the headcount holds.
    expect(parseAdultMetadata({ adult_2_name: "Ada" }, 3)).toEqual([]);
  });

  it("falls back to a positional name when only the email survived", () => {
    expect(parseAdultMetadata({ adult_2_email: "ada@example.com" }, 3)).toEqual([
      { name: "Adult 2", email: "ada@example.com" },
    ]);
  });
});

describe("placeholderAdultEmail", () => {
  const purchaseId = "a1b2c3d4-e5f6-4789-abcd-0123456789ef";

  it("is deterministic, so a webhook retry upserts the same row", () => {
    expect(placeholderAdultEmail(purchaseId, 2)).toBe(
      placeholderAdultEmail(purchaseId, 2),
    );
  });

  it("differs per position so two placeholders cannot collide", () => {
    const emails = [2, 3, 4].map((n) => placeholderAdultEmail(purchaseId, n));
    expect(new Set(emails).size).toBe(3);
  });

  it("uses the unroutable .invalid TLD", () => {
    expect(placeholderAdultEmail(purchaseId, 2).endsWith(".invalid")).toBe(true);
  });
});

describe("validateAdults", () => {
  const buyer = "buyer@example.com";
  const adult = (n: number) => ({ name: `Adult ${n}`, email: `adult${n}@example.com` });

  it("treats a missing quantity as a solo purchase", () => {
    expect(validateAdults(undefined, undefined, buyer)).toEqual([]);
    expect(validateAdults(1, [], buyer)).toEqual([]);
  });

  it("accepts a full party up to the cap", () => {
    const others = Array.from({ length: MAX_ADULTS_PER_PURCHASE - 1 }, (_, i) => adult(i + 2));
    expect(validateAdults(MAX_ADULTS_PER_PURCHASE, others, buyer)).toHaveLength(
      MAX_ADULTS_PER_PURCHASE - 1,
    );
  });

  it("rejects a quantity above the cap", () => {
    const others = Array.from({ length: MAX_ADULTS_PER_PURCHASE }, (_, i) => adult(i + 2));
    expect(() => validateAdults(MAX_ADULTS_PER_PURCHASE + 1, others, buyer)).toThrow(
      /between 1 and 10/,
    );
  });

  it("rejects zero, negative and fractional quantities", () => {
    expect(() => validateAdults(0, [], buyer)).toThrow(/between 1 and 10/);
    expect(() => validateAdults(-1, [], buyer)).toThrow(/between 1 and 10/);
    expect(() => validateAdults(2.5, [adult(2)], buyer)).toThrow(/whole number/);
    expect(() => validateAdults("3", [], buyer)).toThrow(/whole number/);
  });

  it("rejects a count that disagrees with the details supplied", () => {
    expect(() => validateAdults(3, [adult(2)], buyer)).toThrow(/Expected details for 2/);
    expect(() => validateAdults(2, [adult(2), adult(3)], buyer)).toThrow(
      /Expected details for 1/,
    );
    expect(() => validateAdults(2, [], buyer)).toThrow(/Expected details for 1/);
  });

  it("requires a name for every additional adult", () => {
    expect(() =>
      validateAdults(2, [{ name: "   ", email: "x@example.com" }], buyer),
    ).toThrow(/name for adult 2/);
  });

  it("requires a plausible email for every additional adult", () => {
    for (const bad of ["", "   ", "nope", "no@domain", "a b@c.com"]) {
      expect(() => validateAdults(2, [{ name: "Ada", email: bad }], buyer)).toThrow(
        /valid email for adult 2/,
      );
    }
  });

  // attendees has UNIQUE (purchase_id, email): a duplicate would collapse two
  // adults into one row, selling more tickets than people tracked.
  it("rejects two additional adults sharing an email", () => {
    expect(() =>
      validateAdults(3, [
        { name: "Ada", email: "same@example.com" },
        { name: "Alan", email: "same@example.com" },
      ], buyer),
    ).toThrow(/own email address/);
  });

  it("rejects an additional adult reusing the buyer's email", () => {
    expect(() => validateAdults(2, [{ name: "Ada", email: buyer }], buyer)).toThrow(
      /own email address/,
    );
  });

  it("catches duplicates that differ only by case or whitespace", () => {
    expect(() =>
      validateAdults(2, [{ name: "Ada", email: "  BUYER@Example.COM " }], buyer),
    ).toThrow(/own email address/);
  });

  it("trims what it returns", () => {
    expect(validateAdults(2, [{ name: "  Ada  ", email: "  ada@example.com " }], buyer)).toEqual([
      { name: "Ada", email: "ada@example.com" },
    ]);
  });

  it("rejects a non-list", () => {
    expect(() => validateAdults(2, "ada@example.com", buyer)).toThrow(/as a list/);
  });
});
