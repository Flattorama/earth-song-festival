// Pure helpers for the admin dashboard function.
//
// Deliberately free of Deno globals, URL imports and network calls so the same
// code runs in the edge function and in vitest (src/test/manual-waiver-status.test.ts).
// Keep it that way -- if this file starts importing from esm.sh the tests break.

export type WaiverStatus = "signed" | "pending";

export interface AttendeeWaiverState {
  waiver_status: string;
  waiver_signed_method: string | null;
  smartwaiver_id: string | null;
}

export interface StatusUpdates {
  waiver_status: WaiverStatus;
  waiver_signed_at: string | null;
  waiver_signed_method: "paper" | null;
}

export type StatusDecision =
  | { allowed: true; updates: StatusUpdates }
  | { allowed: false; reason: string };

export function isWaiverStatus(value: unknown): value is WaiverStatus {
  return value === "signed" || value === "pending";
}

/**
 * Decides whether a manual status change is legal and what to write if it is.
 *
 * Marking signed records a paper waiver, so it only applies to someone still
 * pending. Reverting is only for undoing a mis-click on a paper mark -- a row
 * with a smartwaiver_id represents a real digital signature and can never be
 * reverted from the dashboard.
 */
export function decideStatusChange(
  attendee: AttendeeWaiverState,
  requested: WaiverStatus,
  now: Date,
): StatusDecision {
  if (requested === "signed") {
    if (attendee.waiver_status === "signed") {
      return { allowed: false, reason: "Attendee is already marked signed" };
    }
    return {
      allowed: true,
      updates: {
        waiver_status: "signed",
        waiver_signed_at: now.toISOString(),
        waiver_signed_method: "paper",
      },
    };
  }

  if (attendee.waiver_status !== "signed") {
    return { allowed: false, reason: "Attendee is already pending" };
  }
  if (attendee.waiver_signed_method !== "paper" || attendee.smartwaiver_id) {
    return {
      allowed: false,
      reason: "Only manual paper marks can be reverted; this attendee signed on Smartwaiver",
    };
  }
  return {
    allowed: true,
    updates: {
      waiver_status: "pending",
      waiver_signed_at: null,
      waiver_signed_method: null,
    },
  };
}
