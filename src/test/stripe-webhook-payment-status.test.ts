import { describe, it, expect } from "vitest";
import {
  isSkippedPaymentSession,
  RECORDABLE_PAYMENT_STATUSES,
  shouldRecordPayment,
} from "../../supabase/functions/stripe-webhook/session.ts";
import { orderPaymentIntentId } from "../../supabase/functions/stripe-webhook/order.ts";

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

/**
 * The second half of the same failure. Getting past the payment_status gate only
 * moved the problem one line down: stripe_orders.payment_intent_id is NOT NULL,
 * a zero-amount session has no payment intent, the insert threw, and the handler
 * returned before creating the purchase. Two stacked bugs, both silent.
 */
describe("orderPaymentIntentId", () => {
  it("uses the real payment intent for a paid ticket", () => {
    expect(orderPaymentIntentId("pi_123", "cs_abc")).toBe("pi_123");
  });

  it("never returns null for a comped ticket, so the NOT NULL insert succeeds", () => {
    expect(orderPaymentIntentId(null, "cs_abc")).toBe("cs_abc");
    expect(orderPaymentIntentId(undefined, "cs_abc")).toBe("cs_abc");
  });

  it("stays traceable to the checkout that produced it", () => {
    expect(orderPaymentIntentId(null, "cs_test_zero_amount")).toContain("cs_test_zero_amount");
  });

  it("returns a non-empty string for every input", () => {
    for (const pi of [null, undefined, "", "pi_1"]) {
      const result = orderPaymentIntentId(pi as string | null, "cs_abc");
      expect(typeof result).toBe("string");
      expect(result.length).toBeGreaterThan(0);
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
