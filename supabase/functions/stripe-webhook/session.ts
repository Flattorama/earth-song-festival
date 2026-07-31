// Which completed Checkout Sessions represent a ticket we should record.
//
// Dependency-free on purpose so vitest can import it
// (src/test/stripe-webhook-payment-status.test.ts).

/**
 * Stripe reports `no_payment_required` -- not `paid` -- when the total came to
 * zero, which is what a 100%-off promotion code produces. The handler used to
 * accept only `paid`, so a comped ticket completed at Stripe, showed the buyer a
 * success page, and was then silently dropped: no purchase row, no attendee
 * rows, no waiver email. Nobody would find out until that person reached the
 * gate and wasn't on the roster.
 *
 * `unpaid` stays excluded. It means the session finished without funds -- a
 * failed or still-processing payment -- and recording it would hand out a ticket
 * nobody paid for.
 */
export const RECORDABLE_PAYMENT_STATUSES = ["paid", "no_payment_required"] as const;

export function shouldRecordPayment(
  mode: string | null | undefined,
  paymentStatus: string | null | undefined,
): boolean {
  if (mode !== "payment") return false;
  return (RECORDABLE_PAYMENT_STATUSES as readonly string[]).includes(paymentStatus ?? "");
}

/** True for a completed one-time session we are deliberately not recording. */
export function isSkippedPaymentSession(
  mode: string | null | undefined,
  paymentStatus: string | null | undefined,
): boolean {
  return mode === "payment" && !shouldRecordPayment(mode, paymentStatus);
}
