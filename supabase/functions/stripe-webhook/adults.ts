// Reads the additional-adult details that create-checkout wrote into Stripe
// metadata.
//
// The writer is buildAdultMetadata in create-checkout/catalog.ts. Edge functions
// here are self-contained -- none import across function directories -- so the
// two halves of this contract are held together by a round-trip test
// (src/test/adult-metadata-contract.test.ts) that runs the real writer against
// the real reader. If you change a key name on one side, that test fails.
//
// Dependency-free on purpose so vitest can import it.

export interface AdultDetails {
  name: string;
  email: string;
}

/**
 * Pulls adults 2..adultCount out of the metadata bag.
 *
 * Entries without an email are skipped rather than guessed at: the caller
 * substitutes an unroutable placeholder so the headcount stays correct even when
 * details are missing.
 */
export function parseAdultMetadata(
  metadata: Record<string, string>,
  adultCount: number,
): AdultDetails[] {
  const adults: AdultDetails[] = [];
  for (let position = 2; position <= adultCount; position++) {
    const name = (metadata[`adult_${position}_name`] || "").trim();
    const email = (metadata[`adult_${position}_email`] || "").trim();
    if (email) adults.push({ name: name || `Adult ${position}`, email });
  }
  return adults;
}

/**
 * Unroutable stand-in for an adult whose email never reached us. Uses the
 * .invalid TLD (RFC 2606) and is deterministic, so a webhook retry upserts the
 * same row instead of creating a second one. Distinct per position because
 * `attendees` carries UNIQUE (purchase_id, email).
 */
export function placeholderAdultEmail(purchaseId: string, position: number): string {
  return `adult.${position}@${purchaseId.replace(/-/g, "")}.invalid`;
}
