import { describe, it, expect } from "vitest";
import {
  isSkippedPaymentSession,
  RECORDABLE_PAYMENT_STATUSES,
  shouldRecordPayment,
} from "../../supabase/functions/stripe-webhook/session.ts";

/**
 * Regression cover for a real production miss: a 100%-off promotion code
 * completed at Stripe with payment_status "no_payment_required", the handler
 * only accepted "paid", and the purchase was dropped without a trace -- no
 * purchase row, no attendees, no waiver email, and a success page telling the
 * buyer everything worked.
 */
describe("shouldRecordPayment", () => {
  it("records a normal paid ticket", () => {
    expect(shouldRecordPayment("payment", "paid")).toBe(true);
  });

  it("records a fully comped ticket (100% off promo code)", () => {
    expect(shouldRecordPayment("payment", "no_payment_required")).toBe(true);
  });

  it("refuses an unpaid session, so nobody gets a ticket for free by accident", () => {
    expect(shouldRecordPayment("payment", "unpaid")).toBe(false);
  });

  it("ignores subscriptions, which take the other branch entirely", () => {
    expect(shouldRecordPayment("subscription", "paid")).toBe(false);
    expect(shouldRecordPayment("subscription", "no_payment_required")).toBe(false);
  });

  it("copes with a missing mode or status rather than throwing", () => {
    expect(shouldRecordPayment(undefined, "paid")).toBe(false);
    expect(shouldRecordPayment(null, "paid")).toBe(false);
    expect(shouldRecordPayment("payment", undefined)).toBe(false);
    expect(shouldRecordPayment("payment", null)).toBe(false);
    expect(shouldRecordPayment("payment", "")).toBe(false);
  });

  it("accepts exactly the two documented statuses and nothing else", () => {
    expect([...RECORDABLE_PAYMENT_STATUSES]).toEqual(["paid", "no_payment_required"]);
    for (const status of ["unpaid", "pending", "processing", "PAID", "Paid", "free"]) {
      expect(shouldRecordPayment("payment", status), `${status} must not record`).toBe(false);
    }
  });
});

describe("isSkippedPaymentSession", () => {
  it("flags a one-time session we deliberately dropped, so it gets logged", () => {
    expect(isSkippedPaymentSession("payment", "unpaid")).toBe(true);
    expect(isSkippedPaymentSession("payment", "pending")).toBe(true);
  });

  it("does not flag sessions we did record", () => {
    expect(isSkippedPaymentSession("payment", "paid")).toBe(false);
    expect(isSkippedPaymentSession("payment", "no_payment_required")).toBe(false);
  });

  it("does not flag subscriptions, which are handled elsewhere", () => {
    expect(isSkippedPaymentSession("subscription", "paid")).toBe(false);
  });

  // Every one-time session either records or logs. Nothing may vanish quietly,
  // which was the whole failure mode.
  it("leaves no one-time payment status both unrecorded and unlogged", () => {
    for (const status of ["paid", "no_payment_required", "unpaid", "pending", "", "weird"]) {
      const recorded = shouldRecordPayment("payment", status);
      const logged = isSkippedPaymentSession("payment", status);
      expect(recorded || logged, `status "${status}" would disappear silently`).toBe(true);
    }
  });
});
