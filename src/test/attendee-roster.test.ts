import { describe, it, expect } from "vitest";
import {
  buildRoster,
  isStripeSessionId,
  type RosterSources,
} from "../../supabase/functions/get-admin-dashboard-data/helpers.ts";

function sources(overrides: Partial<RosterSources> = {}): RosterSources {
  return {
    attendees: [],
    purchases: [],
    legacyWaivers: [],
    legacyMinorWaivers: [],
    paidSessionIds: [],
    ...overrides,
  };
}

const ATTENDEE = {
  id: "aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa",
  purchase_id: "pppppppp-1111-4111-8111-pppppppppppp",
  name: "New Flow Person",
  email: "new@example.com",
  is_minor: false,
  waiver_status: "pending",
  waiver_signed_at: null,
  waiver_signed_method: null,
  smartwaiver_id: null,
};

const PURCHASE = {
  id: "pppppppp-1111-4111-8111-pppppppppppp",
  buyer_name: "New Flow Person",
  buyer_email: "new@example.com",
  ticket_type: "regular-admission",
  adult_ticket_type: "regular-admission",
  stripe_session_id: "cs_live_aaa111",
};

const LEGACY = {
  id: "llllllll-1111-4111-8111-llllllllllll",
  attendee_name: "Legacy Person",
  attendee_email: "legacy@example.com",
  ticket_type: "early-bird",
  stripe_session_id: "cs_live_bbb222",
  accepted_at: "2026-05-02T15:55:46.000Z",
  created_at: "2026-05-02T15:55:46.000Z",
};

const find = (roster: ReturnType<typeof buildRoster>, email: string) =>
  roster.find((entry) => entry.email.toLowerCase() === email);

describe("isStripeSessionId", () => {
  it("accepts a real session id", () => {
    expect(isStripeSessionId("cs_live_b1pz3gqBnj28QQqEkjtJ")).toBe(true);
    expect(isStripeSessionId("  cs_test_abc123  ")).toBe(true);
  });

  it("rejects the prose that ended up in a production row", () => {
    // A legacy row genuinely contains an apology sentence in this column.
    expect(isStripeSessionId("I do not have enough information")).toBe(false);
    expect(isStripeSessionId("")).toBe(false);
    expect(isStripeSessionId(null)).toBe(false);
    expect(isStripeSessionId("pi_live_abc")).toBe(false);
  });
});

describe("legacy waivers become visible", () => {
  it("lists someone who only exists in waiver_acceptances", () => {
    const roster = buildRoster(sources({ legacyWaivers: [LEGACY] }));

    expect(roster).toHaveLength(1);
    expect(roster[0]).toMatchObject({
      name: "Legacy Person",
      origin: "legacy",
      waiverStatus: "signed",
      waiverSource: "legacy",
      attendeeId: null,
      signedAt: "2026-05-02T15:55:46.000Z",
    });
  });

  it("collapses repeat waivers for one person and counts them", () => {
    // 39 production rows covered 31 people, so duplicates are the norm.
    const roster = buildRoster(
      sources({
        legacyWaivers: [
          LEGACY,
          { ...LEGACY, id: "second", accepted_at: "2026-06-01T00:00:00.000Z" },
          { ...LEGACY, id: "third", attendee_email: "LEGACY@example.com" },
        ],
      }),
    );

    expect(roster).toHaveLength(1);
    expect(roster[0].duplicateWaivers).toBe(2);
  });

  it("falls back to created_at when accepted_at is missing", () => {
    const roster = buildRoster(
      sources({ legacyWaivers: [{ ...LEGACY, accepted_at: null }] }),
    );

    expect(roster[0].signedAt).toBe("2026-05-02T15:55:46.000Z");
  });
});

describe("a legacy signature counts for a pending attendee", () => {
  it("reports signed so the gate does not chase an existing signature", () => {
    const roster = buildRoster(
      sources({
        attendees: [ATTENDEE],
        legacyWaivers: [{ ...LEGACY, attendee_email: "new@example.com" }],
      }),
    );

    expect(roster).toHaveLength(1);
    expect(roster[0]).toMatchObject({
      origin: "attendee",
      // Still actionable, because the attendees row owns the entry.
      attendeeId: ATTENDEE.id,
      waiverStatus: "signed",
      waiverSource: "legacy",
    });
  });

  it("does not overwrite a Smartwaiver signature with the legacy one", () => {
    const roster = buildRoster(
      sources({
        attendees: [
          { ...ATTENDEE, waiver_status: "signed", waiver_signed_at: "2026-07-30T00:00:00.000Z" },
        ],
        legacyWaivers: [{ ...LEGACY, attendee_email: "new@example.com" }],
      }),
    );

    expect(roster[0]).toMatchObject({
      waiverSource: "smartwaiver",
      signedAt: "2026-07-30T00:00:00.000Z",
    });
  });

  it("keeps a paper mark labelled as paper", () => {
    const roster = buildRoster(
      sources({
        attendees: [
          { ...ATTENDEE, waiver_status: "signed", waiver_signed_method: "paper" },
        ],
      }),
    );

    expect(roster[0].waiverSource).toBe("paper");
  });

  it("does not label a paper mark revertible once a real signature lands", () => {
    // decideStatusChange refuses to revert this row, so the roster must not
    // report it as paper -- that is what puts the Undo button on screen.
    const roster = buildRoster(
      sources({
        attendees: [
          {
            ...ATTENDEE,
            waiver_status: "signed",
            waiver_signed_method: "paper",
            smartwaiver_id: "sw-abc-123",
          },
        ],
      }),
    );

    expect(roster[0].waiverSource).toBe("smartwaiver");
  });
});

describe("orphaned purchases become visible", () => {
  it("lists a purchase whose attendee rows were never created", () => {
    const roster = buildRoster(sources({ purchases: [PURCHASE] }));

    expect(roster).toHaveLength(1);
    expect(roster[0]).toMatchObject({
      name: "New Flow Person",
      origin: "purchase",
      waiverStatus: "pending",
      waiverSource: "none",
      attendeeId: null,
      hasPaymentRecord: true,
    });
  });

  it("does not duplicate a purchase that already has an attendee", () => {
    const roster = buildRoster(sources({ attendees: [ATTENDEE], purchases: [PURCHASE] }));

    expect(roster).toHaveLength(1);
    expect(roster[0].origin).toBe("attendee");
    expect(roster[0].ticketType).toBe("regular-admission");
  });
});

describe("payment evidence", () => {
  it("flags a legacy waiver with no matching payment anywhere", () => {
    const roster = buildRoster(sources({ legacyWaivers: [LEGACY] }));

    expect(roster[0].hasPaymentRecord).toBe(false);
  });

  it("credits a legacy waiver whose session id matches a paid order", () => {
    const roster = buildRoster(
      sources({ legacyWaivers: [LEGACY], paidSessionIds: ["cs_live_bbb222"] }),
    );

    expect(roster[0].hasPaymentRecord).toBe(true);
  });

  it("ignores a dirty session id even when some order is paid", () => {
    const roster = buildRoster(
      sources({
        legacyWaivers: [{ ...LEGACY, stripe_session_id: "I do not have enough information" }],
        paidSessionIds: ["cs_live_bbb222"],
      }),
    );

    expect(roster[0].hasPaymentRecord).toBe(false);
  });

  it("credits payment by email when a purchases row exists", () => {
    const roster = buildRoster(
      sources({
        legacyWaivers: [{ ...LEGACY, attendee_email: "new@example.com", stripe_session_id: null }],
        purchases: [PURCHASE],
      }),
    );

    expect(find(roster, "new@example.com")?.hasPaymentRecord).toBe(true);
  });
});

describe("legacy minors", () => {
  const MINOR = {
    id: "mmmmmmmm-1111-4111-8111-mmmmmmmmmmmm",
    guardian_name: "Emma Wright",
    guardian_email: "guardian@example.com",
    minor_name: "Elian Proano-Wright",
    youth_ticket_label: "Full Weekend Youth Pass",
    stripe_session_id: "cs_live_ccc333",
    accepted_at: "2026-06-13T18:59:37.000Z",
  };

  it("gets its own row, signed by the guardian", () => {
    const roster = buildRoster(sources({ legacyMinorWaivers: [MINOR] }));

    expect(roster).toHaveLength(1);
    expect(roster[0]).toMatchObject({
      name: "Elian Proano-Wright",
      isMinor: true,
      waiverStatus: "signed",
      waiverSource: "legacy-minor",
      attendeeId: null,
    });
  });

  it("keeps two children of one guardian as separate rows", () => {
    const roster = buildRoster(
      sources({
        legacyMinorWaivers: [MINOR, { ...MINOR, id: "second", minor_name: "Second Child" }],
      }),
    );

    expect(roster).toHaveLength(2);
  });

  it("does not collide with the guardian's own entry", () => {
    const roster = buildRoster(
      sources({
        legacyWaivers: [{ ...LEGACY, attendee_email: "guardian@example.com" }],
        legacyMinorWaivers: [MINOR],
      }),
    );

    expect(roster).toHaveLength(2);
    expect(roster.filter((entry) => entry.isMinor)).toHaveLength(1);
  });
});

describe("ordering", () => {
  it("puts pending rows first, since that is the call list", () => {
    const roster = buildRoster(
      sources({ attendees: [ATTENDEE], legacyWaivers: [LEGACY] }),
    );

    expect(roster[0].waiverStatus).toBe("pending");
    expect(roster[1].waiverStatus).toBe("signed");
  });
});
