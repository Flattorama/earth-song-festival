// Pure helpers for the Smartwaiver webhook.
//
// Deliberately free of Deno globals, URL imports and network calls so the same
// code runs in the edge function and in vitest (src/test/smartwaiver-webhook.test.ts).
// Keep it that way -- if this file starts importing from esm.sh the tests break.

export type MatchMethod = "external_id" | "auto_tag" | "email" | "unmatched";

/** The order attendee matching is attempted in. First hit wins. */
export const MATCH_ORDER: Exclude<MatchMethod, "unmatched">[] = [
  "external_id",
  "auto_tag",
  "email",
];

export interface WaiverIdentifiers {
  externalId: string | null;
  autoTag: string | null;
  email: string | null;
}

export interface MinorParticipant {
  name: string;
  dateOfBirth: string | null;
}

/**
 * Smartwaiver's external_id accepts alphanumerics and underscores only, so the
 * purchase UUID travels with its dashes stripped. This puts them back.
 * Returns null for anything that is not 32 hex characters.
 */
export function fromExternalId(hex: unknown): string | null {
  if (typeof hex !== "string") return null;
  const clean = hex.trim().toLowerCase();
  if (!/^[0-9a-f]{32}$/.test(clean)) return null;
  return [
    clean.slice(0, 8),
    clean.slice(8, 12),
    clean.slice(12, 16),
    clean.slice(16, 20),
    clean.slice(20),
  ].join("-");
}

/** Purchase UUID -> the 32-char form Smartwaiver will accept. */
export function toExternalId(purchaseId: string): string {
  return purchaseId.replace(/-/g, "");
}

/**
 * Smartwaiver has moved these fields around between API revisions, and the
 * auto_tag path populates a different key than the prefill path, so check every
 * spelling rather than trusting one.
 */
export function extractIdentifiers(
  waiver: Record<string, unknown> | null | undefined,
): WaiverIdentifiers {
  const w = (waiver || {}) as Record<string, unknown>;
  const pick = (...keys: string[]): string | null => {
    for (const key of keys) {
      const value = w[key];
      if (typeof value === "string" && value.trim()) return value.trim();
    }
    return null;
  };

  const email = pick("email", "participantEmail");

  return {
    externalId: pick("externalId", "external_id", "clientId"),
    autoTag: pick("autoTag", "auto_tag"),
    email: email ? email.toLowerCase() : null,
  };
}

/**
 * Runs the lookups in MATCH_ORDER, stopping at the first hit. Takes closures
 * rather than a database handle so the ordering is testable on its own.
 */
export async function matchAttendee(
  lookups: Record<Exclude<MatchMethod, "unmatched">, () => Promise<string | null>>,
): Promise<{ attendeeId: string | null; method: MatchMethod }> {
  for (const method of MATCH_ORDER) {
    const attendeeId = await lookups[method]();
    if (attendeeId) return { attendeeId, method };
  }
  return { attendeeId: null, method: "unmatched" };
}

export function slugifyName(name: string): string {
  const slug = (name || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "unnamed";
}

/**
 * Minors have no email of their own, but `attendees` carries
 * UNIQUE (purchase_id, email), so two children on one purchase would collide on
 * an empty string. These synthetic addresses use the .invalid TLD (RFC 2606, so
 * they can never be routed) and are deterministic: replaying the same webhook
 * upserts the same rows instead of creating duplicates. Repeated names inside
 * one waiver get a numeric suffix.
 */
export function syntheticMinorEmails(names: string[], externalId: string): string[] {
  const seen = new Map<string, number>();
  return names.map((name) => {
    const slug = slugifyName(name);
    const previous = seen.get(slug) ?? 0;
    seen.set(slug, previous + 1);
    const suffix = previous === 0 ? "" : `.${previous + 1}`;
    return `minor.${slug}${suffix}@${externalId}.invalid`;
  });
}

/** Pulls the minors out of a waiver's participant list. */
export function extractMinors(
  waiver: Record<string, unknown> | null | undefined,
): MinorParticipant[] {
  const participants = (waiver as { participants?: unknown } | null | undefined)?.participants;
  if (!Array.isArray(participants)) return [];

  return participants
    .filter((p): p is Record<string, unknown> => Boolean(p) && typeof p === "object")
    .filter((p) => p.isMinor === true)
    .map((p) => {
      const first = typeof p.firstName === "string" ? p.firstName.trim() : "";
      const middle = typeof p.middleName === "string" ? p.middleName.trim() : "";
      const last = typeof p.lastName === "string" ? p.lastName.trim() : "";
      const name = [first, middle, last].filter(Boolean).join(" ");
      const dob = typeof p.dob === "string" && p.dob.trim() ? p.dob.trim() : null;
      return { name: name || "Unnamed minor", dateOfBirth: dob };
    });
}
