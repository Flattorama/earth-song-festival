import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import AdminDashboard from "@/pages/AdminDashboard";

// The dashboard's only I/O is the get-admin-dashboard-data function, so a stub
// keeps these tests offline and lets us assert exactly what the UI asks for.
const invoke = vi.fn();
vi.mock("@/integrations/supabase/client", () => ({
  supabase: { functions: { invoke: (...args: unknown[]) => invoke(...args) } },
}));

vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn(), info: vi.fn() } }));

/** A roster row as buildRoster emits it. */
function rosterRow(overrides: Record<string, unknown> = {}) {
  return {
    key: "pending@example.com",
    name: "Pending Person",
    email: "pending@example.com",
    ticketType: "regular-admission",
    origin: "attendee",
    attendeeId: "11111111-1111-4111-8111-111111111111",
    purchaseId: "22222222-2222-4222-8222-222222222222",
    isMinor: false,
    waiverStatus: "pending",
    waiverSource: "none",
    signedAt: null,
    hasPaymentRecord: true,
    duplicateWaivers: 0,
    ...overrides,
  };
}

const PAPER = rosterRow({
  key: "paper@example.com",
  name: "Paper Person",
  email: "paper@example.com",
  attendeeId: "33333333-3333-4333-8333-333333333333",
  waiverStatus: "signed",
  waiverSource: "paper",
  signedAt: "2026-08-07T14:30:00.000Z",
});

const DIGITAL = rosterRow({
  key: "digital@example.com",
  name: "Digital Person",
  email: "digital@example.com",
  attendeeId: "44444444-4444-4444-8444-444444444444",
  waiverStatus: "signed",
  waiverSource: "smartwaiver",
  signedAt: "2026-08-01T10:00:00.000Z",
});

/** Someone who only exists in the pre-August waiver table: no attendee row. */
const LEGACY = rosterRow({
  key: "legacy@example.com",
  name: "Legacy Person",
  email: "legacy@example.com",
  origin: "legacy",
  attendeeId: null,
  purchaseId: null,
  waiverStatus: "signed",
  waiverSource: "legacy",
  signedAt: "2026-05-02T15:55:46.000Z",
  hasPaymentRecord: false,
});

/** Renders with the "all" filter active so signed rows are visible too. */
async function renderDashboard(roster: ReturnType<typeof rosterRow>[]) {
  invoke.mockResolvedValue({
    data: {
      roster,
      sources: {
        attendees: roster.filter((r) => r.origin === "attendee").length,
        purchases: 0,
        legacyWaivers: roster.filter((r) => r.origin === "legacy").length,
        legacyMinorWaivers: 0,
        paidStripeOrders: 0,
      },
      minorWaivers: [],
      unmatchedWaivers: [],
    },
    error: null,
  });
  render(<AdminDashboard />);
  await waitFor(() => expect(invoke).toHaveBeenCalled());
  fireEvent.click(screen.getByRole("button", { name: /^all/i }));
  return screen.getByText(roster[0].name as string);
}

function rowFor(name: string): HTMLElement {
  return screen.getByText(name).closest("tr") as HTMLElement;
}

beforeEach(() => {
  invoke.mockReset();
  // The page is gated on a token in localStorage; seed a dummy so it renders.
  window.localStorage.setItem("earthsong_admin_token", "test-token");
});

describe("waiver status pills", () => {
  it("distinguishes paper, Smartwaiver and pre-August signatures", async () => {
    await renderDashboard([PAPER, DIGITAL, LEGACY]);

    expect(within(rowFor("Paper Person")).getByText(/Signed · paper/)).toBeTruthy();
    expect(within(rowFor("Digital Person")).getByText(/^Signed$/)).toBeTruthy();
    expect(within(rowFor("Legacy Person")).getByText(/Signed · pre-Aug/)).toBeTruthy();
  });
});

describe("available actions", () => {
  it("offers both resend and a paper mark on a pending attendee", async () => {
    await renderDashboard([rosterRow()]);
    const row = within(rowFor("Pending Person"));

    expect(row.getByRole("button", { name: /resend/i })).toBeTruthy();
    expect(row.getByRole("button", { name: /mark signed \(paper\)/i })).toBeTruthy();
  });

  it("offers undo on a paper mark but never on a Smartwaiver signature", async () => {
    await renderDashboard([PAPER, DIGITAL]);

    expect(within(rowFor("Paper Person")).getByRole("button", { name: /undo/i })).toBeTruthy();
    expect(within(rowFor("Digital Person")).queryByRole("button", { name: /undo/i })).toBeNull();
  });

  it("marks a legacy row read-only, since there is no attendee row to act on", async () => {
    await renderDashboard([LEGACY]);
    const row = within(rowFor("Legacy Person"));

    expect(row.getByText(/read-only/i)).toBeTruthy();
    expect(row.queryByRole("button")).toBeNull();
  });
});

describe("flags", () => {
  it("warns when no payment record backs the person", async () => {
    await renderDashboard([LEGACY]);

    expect(within(rowFor("Legacy Person")).getByText(/No payment record/i)).toBeTruthy();
  });

  it("stays quiet when a payment is on file", async () => {
    await renderDashboard([DIGITAL]);

    expect(within(rowFor("Digital Person")).queryByText(/No payment record/i)).toBeNull();
  });

  it("reports duplicate waivers for one person", async () => {
    await renderDashboard([{ ...LEGACY, duplicateWaivers: 2 }]);

    expect(within(rowFor("Legacy Person")).getByText(/3 waivers on file/i)).toBeTruthy();
  });
});

describe("confirming a paper mark", () => {
  it("asks first, then sends the attendee id and the new status", async () => {
    await renderDashboard([rosterRow()]);

    fireEvent.click(
      within(rowFor("Pending Person")).getByRole("button", { name: /mark signed \(paper\)/i }),
    );

    // Nothing is sent until the dialog is confirmed.
    const callsBeforeConfirm = invoke.mock.calls.length;
    const dialog = within(await screen.findByRole("alertdialog"));
    expect(dialog.getByText(/Record a paper waiver\?/i)).toBeTruthy();
    expect(invoke.mock.calls.length).toBe(callsBeforeConfirm);

    fireEvent.click(dialog.getByRole("button", { name: /^mark signed$/i }));

    await waitFor(() => {
      expect(invoke.mock.calls.at(-1)?.[1]).toMatchObject({
        body: {
          action: "set-waiver-status",
          attendeeId: "11111111-1111-4111-8111-111111111111",
          status: "signed",
        },
      });
    });
  });

  it("sends nothing when the dialog is cancelled", async () => {
    await renderDashboard([rosterRow()]);

    fireEvent.click(
      within(rowFor("Pending Person")).getByRole("button", { name: /mark signed \(paper\)/i }),
    );
    const dialog = within(await screen.findByRole("alertdialog"));
    const before = invoke.mock.calls.length;
    fireEvent.click(dialog.getByRole("button", { name: /cancel/i }));

    expect(invoke.mock.calls.length).toBe(before);
    await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
  });

  it("reverts a paper mark back to pending", async () => {
    await renderDashboard([PAPER]);

    fireEvent.click(within(rowFor("Paper Person")).getByRole("button", { name: /undo/i }));
    const dialog = within(await screen.findByRole("alertdialog"));
    fireEvent.click(dialog.getByRole("button", { name: /^undo$/i }));

    await waitFor(() => {
      expect(invoke.mock.calls.at(-1)?.[1]).toMatchObject({
        body: {
          action: "set-waiver-status",
          attendeeId: PAPER.attendeeId,
          status: "pending",
        },
      });
    });
  });
});
