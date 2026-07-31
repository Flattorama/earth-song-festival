// Shaping the stripe_orders row.
//
// Dependency-free so vitest can import it
// (src/test/stripe-webhook-payment-status.test.ts).

/**
 * stripe_orders.payment_intent_id is NOT NULL (inherited boilerplate schema),
 * but a zero-amount Checkout Session has no payment intent at all -- Stripe
 * leaves the field null. Inserting null therefore threw, and because the handler
 * returned on that error, the purchase, attendee rows and waiver emails were all
 * skipped. A comped ticket vanished on the strength of a bookkeeping constraint.
 *
 * Falling back to the session id keeps the row insertable and still traceable
 * back to the exact checkout.
 */
export function orderPaymentIntentId(
  paymentIntent: string | null | undefined,
  checkoutSessionId: string,
): string {
  // Falsy rather than nullish: an empty string would satisfy NOT NULL while
  // leaving the row untraceable, which is the problem we are solving.
  return paymentIntent && paymentIntent.trim() ? paymentIntent : checkoutSessionId;
}
