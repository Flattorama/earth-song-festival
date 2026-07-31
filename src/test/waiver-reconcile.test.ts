import { describe, it, expect } from "vitest";
import {
  MAX_REMINDERS,
  daysUntilFestival,
  decideReminder,
  isSameUtcDay,
  reminderSubject,
  type ReminderCandidate,
} from "../../supabase/functions/waiver-reconcile/helpers.ts";

const FESTIVAL = new Date("2026-08-07T00:00:00Z");

/** A buyer who was emailed a week ago and has never been reminded. */
const baseCandidate = (over: Partial<ReminderCandidate> = {}): ReminderCandidate => ({
  waiverReminderCount: 0,
  waiverLastReminderAt: null,
  waiverEmailSentAt: "2026-07-24T12:00:00Z",
  purchaseCreatedAt: "2026-07-24T12:00:00Z",
  ...over,
});

describe("daysUntilFestival", () => {
  it("counts whole days regardless of time of day", () => {
    expect(daysUntilFestival(new Date("2026-08-06T23:00:00Z"), FESTIVAL)).toBe(1);
    expect(daysUntilFestival(new Date("2026-08-06T01:00:00Z"), FESTIVAL)).toBe(1);
    expect(daysUntilFestival(new Date("2026-08-01T12:00:00Z"), FESTIVAL)).toBe(6);
  });

  it("is zero on the day and negative afterwards", () => {
    expect(daysUntilFestival(new Date("2026-08-07T09:00:00Z"), FESTIVAL)).toBe(0);
    expect(daysUntilFestival(new Date("2026-08-09T09:00:00Z"), FESTIVAL)).toBe(-2);
  });
});

describe("isSameUtcDay", () => {
  it("compares calendar days, not elapsed hours", () => {
    expect(isSameUtcDay(new Date("2026-08-01T00:10:00Z"), new Date("2026-08-01T23:50:00Z"))).toBe(true);
    expect(isSameUtcDay(new Date("2026-08-01T23:50:00Z"), new Date("2026-08-02T00:10:00Z"))).toBe(false);
  });
});

describe("reminder hard limits", () => {
  it("never exceeds the cap, however close the festival is", () => {
    const decision = decideReminder(
      baseCandidate({ waiverReminderCount: MAX_REMINDERS }),
      new Date("2026-08-06T09:00:00Z"), // one day out, maximum urgency
      FESTIVAL,
    );
    expect(decision.send).toBe(false);
    expect(decision.reason).toContain("cap");
  });

  it("never sends twice in one calendar day", () => {
    const decision = decideReminder(
      baseCandidate({ waiverReminderCount: 1, waiverLastReminderAt: "2026-08-03T02:00:00Z" }),
      new Date("2026-08-03T22:00:00Z"),
      FESTIVAL,
    );
    expect(decision.send).toBe(false);
    expect(decision.reason).toContain("today");
  });

  it("does send again the next calendar day", () => {
    const decision = decideReminder(
      baseCandidate({ waiverReminderCount: 1, waiverLastReminderAt: "2026-08-03T22:00:00Z" }),
      new Date("2026-08-04T02:00:00Z"),
      FESTIVAL,
    );
    expect(decision.send).toBe(true);
  });

  it("stays silent until the initial email has actually gone out", () => {
    const decision = decideReminder(
      baseCandidate({ waiverEmailSentAt: null }),
      new Date("2026-08-05T09:00:00Z"),
      FESTIVAL,
    );
    expect(decision.send).toBe(false);
    expect(decision.reason).toContain("not sent yet");
  });

  it("stops once the festival has started", () => {
    const decision = decideReminder(
      baseCandidate(),
      new Date("2026-08-08T09:00:00Z"),
      FESTIVAL,
    );
    expect(decision.send).toBe(false);
  });
});

describe("reminder cadence", () => {
  it("waits 48 hours after the first email when there is runway", () => {
    const emailed = "2026-07-30T12:00:00Z";

    expect(
      decideReminder(
        baseCandidate({ waiverEmailSentAt: emailed, purchaseCreatedAt: emailed }),
        new Date("2026-07-31T12:00:00Z"), // 24h later
        FESTIVAL,
      ).send,
    ).toBe(false);

    const due = decideReminder(
      baseCandidate({ waiverEmailSentAt: emailed, purchaseCreatedAt: emailed }),
      new Date("2026-08-01T12:00:00Z"), // 48h later, 6 days out
      FESTIVAL,
    );
    expect(due.send).toBe(true);
    expect(due.reason).toContain("48 hours");
  });

  it("sends the second nudge 5 days after purchase", () => {
    const decision = decideReminder(
      baseCandidate({
        waiverReminderCount: 1,
        waiverEmailSentAt: "2026-07-25T12:00:00Z",
        purchaseCreatedAt: "2026-07-25T12:00:00Z",
        waiverLastReminderAt: "2026-07-27T12:00:00Z",
      }),
      new Date("2026-07-31T12:00:00Z"), // 6 days after purchase, 7 days out
      FESTIVAL,
    );
    expect(decision.send).toBe(true);
    expect(decision.reason).toContain("5 days");
  });

  it("goes daily inside 5 days", () => {
    const decision = decideReminder(
      baseCandidate({ waiverReminderCount: 2, waiverLastReminderAt: "2026-08-01T12:00:00Z" }),
      new Date("2026-08-02T12:00:00Z"), // 5 days out
      FESTIVAL,
    );
    expect(decision.send).toBe(true);
    expect(decision.reason).toBe("daily");
    expect(decision.urgent).toBe(false);
  });

  it("turns urgent at 2 days out", () => {
    const decision = decideReminder(
      baseCandidate({ waiverReminderCount: 3, waiverLastReminderAt: "2026-08-04T12:00:00Z" }),
      new Date("2026-08-05T12:00:00Z"), // 2 days out
      FESTIVAL,
    );
    expect(decision.send).toBe(true);
    expect(decision.urgent).toBe(true);
  });

  it("sends a final notice on the last day", () => {
    const decision = decideReminder(
      baseCandidate({ waiverReminderCount: 4, waiverLastReminderAt: "2026-08-05T12:00:00Z" }),
      new Date("2026-08-06T12:00:00Z"), // 1 day out
      FESTIVAL,
    );
    expect(decision.send).toBe(true);
    expect(decision.reason).toBe("final notice");
    expect(decision.urgent).toBe(true);
  });

  it("cannot exceed five reminders across a realistic run of days", () => {
    // Walk a pending buyer day by day from purchase to the festival, applying
    // the same bookkeeping the function does, and confirm the cap holds.
    let candidate = baseCandidate({
      waiverEmailSentAt: "2026-07-24T12:00:00Z",
      purchaseCreatedAt: "2026-07-24T12:00:00Z",
    });
    let sent = 0;

    for (let day = 24; day <= 31; day++) {
      const now = new Date(`2026-07-${day}T12:00:00Z`);
      if (decideReminder(candidate, now, FESTIVAL).send) {
        sent++;
        candidate = {
          ...candidate,
          waiverReminderCount: candidate.waiverReminderCount + 1,
          waiverLastReminderAt: now.toISOString(),
        };
      }
    }
    for (let day = 1; day <= 7; day++) {
      const now = new Date(`2026-08-0${day}T12:00:00Z`);
      if (decideReminder(candidate, now, FESTIVAL).send) {
        sent++;
        candidate = {
          ...candidate,
          waiverReminderCount: candidate.waiverReminderCount + 1,
          waiverLastReminderAt: now.toISOString(),
        };
      }
    }

    expect(sent).toBeLessThanOrEqual(MAX_REMINDERS);
    expect(candidate.waiverReminderCount).toBeLessThanOrEqual(MAX_REMINDERS);
  });
});

describe("reminderSubject", () => {
  it("escalates as the festival approaches", () => {
    expect(reminderSubject(false, 6)).toContain("reminder");
    expect(reminderSubject(true, 2)).toContain("required before entry");
    expect(reminderSubject(true, 1)).toContain("gate");
  });
});
