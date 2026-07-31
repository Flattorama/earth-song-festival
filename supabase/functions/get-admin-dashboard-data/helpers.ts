// Pure helpers for the admin dashboard function.
//
// Deliberately free of Deno globals, URL imports and network calls so the same
// code runs in the edge function and in vitest (src/test/manual-waiver-status.test.ts,
// src/test/attendee-roster.test.ts).
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

// ---------------------------------------------------------------------------
// Unified roster
//
// Ticket buyers arrive in the database by two different eras of the checkout.
// Everyone who bought before the Smartwaiver migration signed the in-checkout
// waiver, which wrote `waiver_acceptances`; the dashboard's main list only ever
// read `attendees`, so those people were invisible. Purchases whose attendee
// rows were never created were invisible too.
//
// buildRoster folds every source into one list keyed by email, so the gate sees
// one searchable roster instead of four tables. Read-only by design: it never
// invents an attendee row, and an entry without `attendeeId` has no actions.
// ---------------------------------------------------------------------------

/** Where the entry came from, and therefore what can be done with it. */
export type RosterOrigin = "attendee" | "legacy" | "purchase";

/** How we know this person has a waiver on file, if at all. */
export type WaiverSource =
  | "smartwaiver"
  | "paper"
  | "legacy"
  | "legacy-minor"
  | "none";

export interface AttendeeSource {
  id: string;
  purchase_id: string;
  name: string;
  email: string;
  is_minor: boolean;
  waiver_status: string;
  waiver_signed_at: string | null;
  waiver_signed_method: string | null;
  smartwaiver_id: string | null;
}

export interface PurchaseSource {
  id: string;
  buyer_name: string;
  buyer_email: string;
  ticket_type: string;
  adult_ticket_type: string | null;
  stripe_session_id: string | null;
}

export interface LegacyWaiverSource {
  id: string;
  attendee_name: string;
  attendee_email: string;
  ticket_type: string | null;
  stripe_session_id: string | null;
  accepted_at: string | null;
  created_at: string;
}

export interface LegacyMinorSource {
  id: string;
  guardian_name: string;
  guardian_email: string;
  minor_name: string;
  youth_ticket_label: string | null;
  stripe_session_id: string | null;
  accepted_at: string | null;
}

export interface RosterEntry {
  key: string;
  name: string;
  email: string;
  ticketType: string | null;
  origin: RosterOrigin;
  /** Null for legacy and purchase-only rows: no attendees row exists to act on. */
  attendeeId: string | null;
  purchaseId: string | null;
  isMinor: boolean;
  waiverStatus: WaiverStatus;
  waiverSource: WaiverSource;
  signedAt: string | null;
  /** False when nothing in Supabase evidences a payment for this person. */
  hasPaymentRecord: boolean;
  /** Extra legacy waiver rows for the same email -- 39 rows covered 31 people. */
  duplicateWaivers: number;
}

export interface RosterSources {
  attendees: AttendeeSource[];
  purchases: PurchaseSource[];
  legacyWaivers: LegacyWaiverSource[];
  legacyMinorWaivers: LegacyMinorSource[];
  /** checkout_session_id of every non-deleted, paid stripe_orders row. */
  paidSessionIds: string[];
}

/**
 * Legacy rows carry a free-text stripe_session_id that was sometimes filled in
 * by hand -- one production row holds an apology sentence rather than an id. Only
 * a real Stripe session id may count as payment evidence.
 */
export function isStripeSessionId(value: unknown): boolean {
  return typeof value === "string" && /^cs_[A-Za-z0-9_]+$/.test(value.trim());
}

function normalizeEmail(value: unknown): string {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

/** Minors on a guardian's waiver have no email, so key them off the guardian. */
function minorKey(guardianEmail: string, minorName: string): string {
  return `minor:${guardianEmail}:${(minorName || "").trim().toLowerCase()}`;
}

/**
 * Builds the one-row-per-person roster.
 *
 * Precedence is deliberate: an `attendees` row always owns the entry, because it
 * is the only source that supports actions. Legacy waivers then *annotate* those
 * entries -- someone still `pending` in `attendees` who signed the old waiver is
 * reported as signed, so the gate does not chase a signature that already exists.
 */
export function buildRoster(sources: RosterSources): RosterEntry[] {
  const paidSessions = new Set(
    sources.paidSessionIds.filter(isStripeSessionId).map((id) => id.trim()),
  );
  const entries = new Map<string, RosterEntry>();

  const paidEmails = new Set<string>();
  const purchaseByEmail = new Map<string, PurchaseSource>();
  for (const purchase of sources.purchases) {
    const email = normalizeEmail(purchase.buyer_email);
    if (!email) continue;
    paidEmails.add(email);
    if (!purchaseByEmail.has(email)) purchaseByEmail.set(email, purchase);
  }

  const sessionBacked = (email: string, sessionId: string | null): boolean =>
    paidEmails.has(email) ||
    (isStripeSessionId(sessionId) && paidSessions.has(String(sessionId).trim()));

  // 1. attendees -- authoritative, and the only actionable source.
  for (const attendee of sources.attendees) {
    const email = normalizeEmail(attendee.email);
    const key = email || `attendee:${attendee.id}`;
    const signed = attendee.waiver_status === "signed";
    const purchase = purchaseByEmail.get(email);
    entries.set(key, {
      key,
      name: attendee.name || "",
      email: attendee.email || "",
      ticketType: purchase?.adult_ticket_type || purchase?.ticket_type || null,
      origin: "attendee",
      attendeeId: attendee.id,
      purchaseId: attendee.purchase_id || purchase?.id || null,
      isMinor: attendee.is_minor,
      waiverStatus: signed ? "signed" : "pending",
      // "paper" is what makes the Undo action appear, and decideStatusChange
      // refuses to revert anything carrying a real signature. Keeping the two
      // rules identical stops the UI offering a button the server will reject.
      waiverSource: signed
        ? attendee.waiver_signed_method === "paper" && !attendee.smartwaiver_id
          ? "paper"
          : "smartwaiver"
        : "none",
      signedAt: attendee.waiver_signed_at,
      // Minors never pay separately; they ride on the guardian's purchase.
      hasPaymentRecord:
        attendee.is_minor || Boolean(attendee.purchase_id) || paidEmails.has(email),
      duplicateWaivers: 0,
    });
  }

  // 2. legacy adult waivers -- new entries, or signature evidence for existing ones.
  for (const waiver of sources.legacyWaivers) {
    const email = normalizeEmail(waiver.attendee_email);
    const key = email || `legacy:${waiver.id}`;
    const signedAt = waiver.accepted_at || waiver.created_at;
    const existing = entries.get(key);

    if (existing) {
      existing.duplicateWaivers++;
      if (existing.waiverStatus === "pending") {
        existing.waiverStatus = "signed";
        existing.waiverSource = "legacy";
        existing.signedAt = signedAt;
      }
      if (!existing.hasPaymentRecord && sessionBacked(email, waiver.stripe_session_id)) {
        existing.hasPaymentRecord = true;
      }
      continue;
    }

    entries.set(key, {
      key,
      name: waiver.attendee_name || "",
      email: waiver.attendee_email || "",
      ticketType: waiver.ticket_type || null,
      origin: "legacy",
      attendeeId: null,
      purchaseId: purchaseByEmail.get(email)?.id || null,
      isMinor: false,
      waiverStatus: "signed",
      waiverSource: "legacy",
      signedAt,
      hasPaymentRecord: sessionBacked(email, waiver.stripe_session_id),
      duplicateWaivers: 0,
    });
  }

  // 3. legacy minors -- their own entries, covered by the guardian's signature.
  for (const minor of sources.legacyMinorWaivers) {
    const guardianEmail = normalizeEmail(minor.guardian_email);
    const key = minorKey(guardianEmail, minor.minor_name);
    if (entries.has(key)) continue;
    entries.set(key, {
      key,
      name: minor.minor_name || "Unnamed minor",
      email: minor.guardian_email || "",
      ticketType: minor.youth_ticket_label || null,
      origin: "legacy",
      attendeeId: null,
      purchaseId: null,
      isMinor: true,
      waiverStatus: "signed",
      waiverSource: "legacy-minor",
      signedAt: minor.accepted_at,
      hasPaymentRecord: sessionBacked(guardianEmail, minor.stripe_session_id),
      duplicateWaivers: 0,
    });
  }

  // 4. purchases with nothing else attached -- the invisible orphans.
  for (const purchase of sources.purchases) {
    const email = normalizeEmail(purchase.buyer_email);
    const key = email || `purchase:${purchase.id}`;
    if (entries.has(key)) continue;
    entries.set(key, {
      key,
      name: purchase.buyer_name || "",
      email: purchase.buyer_email || "",
      ticketType: purchase.adult_ticket_type || purchase.ticket_type || null,
      origin: "purchase",
      attendeeId: null,
      purchaseId: purchase.id,
      isMinor: false,
      waiverStatus: "pending",
      waiverSource: "none",
      signedAt: null,
      hasPaymentRecord: true,
      duplicateWaivers: 0,
    });
  }

  // Pending first -- that is the call list -- then oldest signature first.
  return [...entries.values()].sort((a, b) => {
    if (a.waiverStatus !== b.waiverStatus) return a.waiverStatus === "pending" ? -1 : 1;
    return (a.signedAt || "").localeCompare(b.signedAt || "");
  });
}
