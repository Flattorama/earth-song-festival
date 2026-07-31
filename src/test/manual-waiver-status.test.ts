import { describe, it, expect } from "vitest";
import {
  type AttendeeWaiverState,
  decideStatusChange,
  isWaiverStatus,
} from "../../supabase/functions/get-admin-dashboard-data/helpers.ts";

const NOW = new Date("2026-08-07T14:30:00.000Z");

function attendee(overrides: Partial<AttendeeWaiverState> = {}): AttendeeWaiverState {
  return {
    waiver_status: "pending",
    waiver_signed_method: null,
    smartwaiver_id: null,
    ...overrides,
  };
}

describe("isWaiverStatus", () => {
  it("accepts only the two statuses the dashboard can set", () => {
    expect(isWaiverStatus("signed")).toBe(true);
    expect(isWaiverStatus("pending")).toBe(true);
  });

  it("rejects anything else, including near misses and non-strings", () => {
    for (const value of ["", "SIGNED", "paper", "unmatched", null, undefined, 1, {}]) {
      expect(isWaiverStatus(value)).toBe(false);
    }
  });
});

describe("marking a paper waiver signed", () => {
  it("stamps the time and records that it came in on paper", () => {
    const decision = decideStatusChange(attendee(), "signed", NOW);

    expect(decision).toEqual({
      allowed: true,
      updates: {
        waiver_status: "signed",
        waiver_signed_at: "2026-08-07T14:30:00.000Z",
        waiver_signed_method: "paper",
      },
    });
  });

  it("refuses when the attendee is already signed", () => {
    // Otherwise a mis-click would overwrite a real Smartwaiver signature's
    // timestamp and relabel it as paper.
    const digital = attendee({ waiver_status: "signed", smartwaiver_id: "abc123" });
    const decision = decideStatusChange(digital, "signed", NOW);

    expect(decision.allowed).toBe(false);
    expect(decision).toHaveProperty("reason");
  });
});

describe("reverting a paper mark", () => {
  it("clears the status, the timestamp and the method together", () => {
    const paper = attendee({
      waiver_status: "signed",
      waiver_signed_method: "paper",
    });
    const decision = decideStatusChange(paper, "pending", NOW);

    expect(decision).toEqual({
      allowed: true,
      updates: {
        waiver_status: "pending",
        waiver_signed_at: null,
        waiver_signed_method: null,
      },
    });
  });

  it("refuses to revert a Smartwaiver signature", () => {
    const digital = attendee({ waiver_status: "signed", smartwaiver_id: "abc123" });
    const decision = decideStatusChange(digital, "pending", NOW);

    expect(decision.allowed).toBe(false);
  });

  it("refuses even when a paper mark later picked up a Smartwaiver id", () => {
    // Someone marked as paper at the gate can still sign digitally afterwards.
    // Once a real signature exists, the dashboard must not delete it.
    const both = attendee({
      waiver_status: "signed",
      waiver_signed_method: "paper",
      smartwaiver_id: "abc123",
    });

    expect(decideStatusChange(both, "pending", NOW).allowed).toBe(false);
  });

  it("refuses when the attendee is already pending", () => {
    expect(decideStatusChange(attendee(), "pending", NOW).allowed).toBe(false);
  });
});
