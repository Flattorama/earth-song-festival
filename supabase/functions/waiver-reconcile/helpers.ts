// Pure scheduling helpers for waiver-reconcile.
//
// No Deno globals, no network, no clock of their own -- "now" is always passed
// in. That keeps the reminder schedule testable from vitest
// (src/test/waiver-reconcile.test.ts) without waiting for real dates.

export const MAX_REMINDERS = 5;

export interface ReminderCandidate {
  waiverReminderCount: number;
  waiverLastReminderAt: string | null;
  waiverEmailSentAt: string | null;
  purchaseCreatedAt: string;
}

export interface ReminderDecision {
  send: boolean;
  reason: string;
  urgent: boolean;
}

/** Whole days from `now` until the festival opens. Negative once it has begun. */
export function daysUntilFestival(now: Date, festivalStart: Date): number {
  const startOfDay = (d: Date) => Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
  return Math.round((startOfDay(festivalStart) - startOfDay(now)) / 86_400_000);
}

export function isSameUtcDay(a: Date, b: Date): boolean {
  return (
    a.getUTCFullYear() === b.getUTCFullYear() &&
    a.getUTCMonth() === b.getUTCMonth() &&
    a.getUTCDate() === b.getUTCDate()
  );
}

function hoursBetween(later: Date, earlier: Date): number {
  return (later.getTime() - earlier.getTime()) / 3_600_000;
}

/**
 * Decides whether a pending attendee gets a reminder on this run.
 *
 * Cadence tightens as the festival approaches: gentle nudges at 48h and 5 days
 * after purchase while there is runway, then daily inside 5 days, and a final
 * "sign at the gate" warning on the last day.
 *
 * Two hard limits apply regardless: never more than MAX_REMINDERS in total, and
 * never twice in the same calendar day.
 */
export function decideReminder(
  candidate: ReminderCandidate,
  now: Date,
  festivalStart: Date,
): ReminderDecision {
  // Nothing to remind them about until the first email has actually gone out.
  if (!candidate.waiverEmailSentAt) {
    return { send: false, reason: "initial email not sent yet", urgent: false };
  }

  if (candidate.waiverReminderCount >= MAX_REMINDERS) {
    return { send: false, reason: `reminder cap of ${MAX_REMINDERS} reached`, urgent: false };
  }

  if (candidate.waiverLastReminderAt) {
    const last = new Date(candidate.waiverLastReminderAt);
    if (isSameUtcDay(last, now)) {
      return { send: false, reason: "already reminded today", urgent: false };
    }
  }

  const daysOut = daysUntilFestival(now, festivalStart);

  if (daysOut < 0) {
    return { send: false, reason: "festival has already started", urgent: false };
  }

  if (daysOut <= 1) {
    return { send: true, reason: "final notice", urgent: true };
  }

  if (daysOut <= 2) {
    return { send: true, reason: "daily, required before entry", urgent: true };
  }

  if (daysOut <= 5) {
    return { send: true, reason: "daily", urgent: false };
  }

  // More than 5 days out: only at 48 hours and 5 days after they bought.
  const sinceEmail = hoursBetween(now, new Date(candidate.waiverEmailSentAt));
  const sincePurchase = hoursBetween(now, new Date(candidate.purchaseCreatedAt));

  if (candidate.waiverReminderCount === 0 && sinceEmail >= 48) {
    return { send: true, reason: "48 hours after the first email", urgent: false };
  }
  if (candidate.waiverReminderCount === 1 && sincePurchase >= 120) {
    return { send: true, reason: "5 days after purchase", urgent: false };
  }

  return { send: false, reason: "not due yet", urgent: false };
}

export function reminderSubject(urgent: boolean, daysOut: number): string {
  if (daysOut <= 1) {
    return "Earth Song waiver — sign tonight or sign at the gate";
  }
  if (urgent) {
    return "Earth Song waiver — required before entry";
  }
  return "A reminder to sign your Earth Song waiver";
}

export function reminderBody(
  firstName: string,
  waiverUrl: string,
  daysOut: number,
): string {
  const opening = firstName ? `Hi ${firstName},` : "Hi there,";
  const urgency =
    daysOut <= 1
      ? "The gates open tomorrow. If you cannot sign tonight you can still sign at the registration desk, but it means a wait for you and everyone behind you."
      : daysOut <= 2
        ? "The festival starts in a couple of days and this is required before entry."
        : "It takes about two minutes and it is required before entry.";

  return [
    opening,
    "",
    `We do not have your signed waiver yet. ${urgency}`,
    "",
    waiverUrl,
    "",
    "Every adult attending signs their own. If you bought tickets for other",
    "adults, please forward them this link.",
    "",
    "Bringing children? Select both Adult and Minor(s) on the first screen so",
    "you are covered as well as them.",
    "",
    "August 7-9, 2026",
    "Still Life Retreat, West Grey, Ontario",
    "",
    "The Earth Song team",
  ].join("\n");
}
