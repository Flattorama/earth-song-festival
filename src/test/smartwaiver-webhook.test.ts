import { describe, it, expect, vi } from "vitest";
import {
  extractIdentifiers,
  extractMinors,
  fromExternalId,
  matchAttendee,
  slugifyName,
  syntheticMinorEmails,
  toExternalId,
} from "../../supabase/functions/smartwaiver-webhook/helpers.ts";

describe("external id round trip", () => {
  it("strips dashes on the way out and restores them on the way back", () => {
    const purchaseId = "a1b2c3d4-e5f6-4789-abcd-0123456789ef";
    const external = toExternalId(purchaseId);

    expect(external).toBe("a1b2c3d4e5f64789abcd0123456789ef");
    expect(external).toHaveLength(32);
    // Smartwaiver rejects anything outside alphanumerics and underscore.
    expect(external).toMatch(/^[a-z0-9]+$/);
    expect(fromExternalId(external)).toBe(purchaseId);
  });

  it("rejects values that are not 32 hex characters", () => {
    expect(fromExternalId("")).toBeNull();
    expect(fromExternalId(null)).toBeNull();
    expect(fromExternalId(undefined)).toBeNull();
    expect(fromExternalId(12345)).toBeNull();
    expect(fromExternalId("not-a-uuid")).toBeNull();
    expect(fromExternalId("a1b2c3d4e5f64789abcd0123456789")).toBeNull(); // 30 chars
    expect(fromExternalId("g1b2c3d4e5f64789abcd0123456789ef")).toBeNull(); // non-hex
  });

  it("tolerates casing and surrounding whitespace", () => {
    expect(fromExternalId("  A1B2C3D4E5F64789ABCD0123456789EF  ")).toBe(
      "a1b2c3d4-e5f6-4789-abcd-0123456789ef",
    );
  });
});

describe("matchAttendee ordering", () => {
  const lookups = (
    externalId: string | null,
    autoTag: string | null,
    email: string | null,
  ) => ({
    external_id: vi.fn(async () => externalId),
    auto_tag: vi.fn(async () => autoTag),
    email: vi.fn(async () => email),
  });

  it("prefers external_id and does not run the later lookups", async () => {
    const l = lookups("att-1", "att-2", "att-3");
    const result = await matchAttendee(l);

    expect(result).toEqual({ attendeeId: "att-1", method: "external_id" });
    expect(l.external_id).toHaveBeenCalledOnce();
    expect(l.auto_tag).not.toHaveBeenCalled();
    expect(l.email).not.toHaveBeenCalled();
  });

  it("falls through to auto_tag when external_id misses", async () => {
    const l = lookups(null, "att-2", "att-3");
    const result = await matchAttendee(l);

    expect(result).toEqual({ attendeeId: "att-2", method: "auto_tag" });
    expect(l.email).not.toHaveBeenCalled();
  });

  it("falls through to email when both id lookups miss", async () => {
    const l = lookups(null, null, "att-3");
    const result = await matchAttendee(l);

    expect(result).toEqual({ attendeeId: "att-3", method: "email" });
    expect(l.external_id).toHaveBeenCalledOnce();
    expect(l.auto_tag).toHaveBeenCalledOnce();
    expect(l.email).toHaveBeenCalledOnce();
  });

  it("reports unmatched rather than throwing when nothing hits", async () => {
    const result = await matchAttendee(lookups(null, null, null));
    expect(result).toEqual({ attendeeId: null, method: "unmatched" });
  });
});

describe("synthetic minor emails", () => {
  const externalId = "a1b2c3d4e5f64789abcd0123456789ef";

  it("is deterministic, so a webhook replay upserts the same rows", () => {
    const names = ["Ada Lovelace", "Alan Turing"];
    expect(syntheticMinorEmails(names, externalId)).toEqual(
      syntheticMinorEmails(names, externalId),
    );
  });

  it("gives each minor on a purchase a distinct address", () => {
    const emails = syntheticMinorEmails(["Ada Lovelace", "Alan Turing"], externalId);
    expect(new Set(emails).size).toBe(2);
    expect(emails[0]).toBe(`minor.ada-lovelace@${externalId}.invalid`);
    expect(emails[1]).toBe(`minor.alan-turing@${externalId}.invalid`);
  });

  it("keeps same-named siblings apart", () => {
    const emails = syntheticMinorEmails(["Sam Fox", "Sam Fox", "Sam Fox"], externalId);
    expect(new Set(emails).size).toBe(3);
    expect(emails).toEqual([
      `minor.sam-fox@${externalId}.invalid`,
      `minor.sam-fox.2@${externalId}.invalid`,
      `minor.sam-fox.3@${externalId}.invalid`,
    ]);
  });

  it("separates minors on different purchases", () => {
    const other = "ffffffffffffffffffffffffffffffff";
    expect(syntheticMinorEmails(["Ada Lovelace"], externalId)[0]).not.toBe(
      syntheticMinorEmails(["Ada Lovelace"], other)[0],
    );
  });

  it("uses the unroutable .invalid TLD so nothing can ever be delivered", () => {
    for (const email of syntheticMinorEmails(["Ada Lovelace"], externalId)) {
      expect(email.endsWith(".invalid")).toBe(true);
    }
  });

  it("never produces an empty local part", () => {
    const emails = syntheticMinorEmails(["", "   ", "***"], externalId);
    for (const email of emails) {
      expect(email).not.toMatch(/^minor\.@/);
    }
    expect(new Set(emails).size).toBe(3);
  });
});

describe("slugifyName", () => {
  it("folds accents and punctuation to a plain slug", () => {
    expect(slugifyName("Zoe Fraser")).toBe("zoe-fraser");
    expect(slugifyName("Jean-Luc  O'Brien")).toBe("jean-luc-o-brien");
  });

  it("falls back to 'unnamed' for empty input", () => {
    expect(slugifyName("")).toBe("unnamed");
    expect(slugifyName("   ")).toBe("unnamed");
  });
});

describe("extractIdentifiers", () => {
  it("reads the prefill spelling", () => {
    expect(
      extractIdentifiers({ externalId: "abc", autoTag: "tag", email: "A@B.COM" }),
    ).toEqual({ externalId: "abc", autoTag: "tag", email: "a@b.com" });
  });

  it("reads the snake_case and clientId spellings", () => {
    expect(extractIdentifiers({ external_id: "abc" }).externalId).toBe("abc");
    expect(extractIdentifiers({ clientId: "abc" }).externalId).toBe("abc");
    expect(extractIdentifiers({ auto_tag: "tag" }).autoTag).toBe("tag");
  });

  it("returns nulls for missing, blank or absent objects", () => {
    expect(extractIdentifiers({})).toEqual({
      externalId: null,
      autoTag: null,
      email: null,
    });
    expect(extractIdentifiers(null)).toEqual({
      externalId: null,
      autoTag: null,
      email: null,
    });
    expect(extractIdentifiers({ externalId: "   " }).externalId).toBeNull();
  });
});

describe("extractMinors", () => {
  it("returns only the participants flagged as minors", () => {
    const minors = extractMinors({
      participants: [
        { firstName: "Ada", lastName: "Lovelace", isMinor: false, dob: "1990-01-01" },
        { firstName: "Sam", lastName: "Fox", isMinor: true, dob: "2015-04-02" },
      ],
    });

    expect(minors).toEqual([{ name: "Sam Fox", dateOfBirth: "2015-04-02" }]);
  });

  it("includes a middle name when present and copes with missing fields", () => {
    const minors = extractMinors({
      participants: [
        { firstName: "Sam", middleName: "Jo", lastName: "Fox", isMinor: true },
        { isMinor: true },
      ],
    });

    expect(minors).toEqual([
      { name: "Sam Jo Fox", dateOfBirth: null },
      { name: "Unnamed minor", dateOfBirth: null },
    ]);
  });

  it("returns an empty list when there are no participants", () => {
    expect(extractMinors({})).toEqual([]);
    expect(extractMinors(null)).toEqual([]);
    expect(extractMinors({ participants: "nonsense" })).toEqual([]);
  });
});
