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

function attendee(overrides: Record<string, unknown> = {}) {
  return {
    id: "11111111-1111-4111-8111-111111111111",
    name: "Pending Person",
    email: "pending@example.com",
    phone: null,
    is_buyer: true,
    is_minor: false,
    waiver_status: "pending",
    waiver_signed_at: null,
    waiver_signed_method: null,
    waiver_email_sent_at: null,
    waiver_reminder_count: 0,
    waiver_last_reminder_at: null,
    smartwaiver_id: null,
    smartwaiver_url: null,
    checked_in_at: null,
    created_at: "2026-07-01T00:00:00.000Z",
    purchase_id: "22222222-2222-4222-8222-222222222222",
    ...overrides,
  };
}

const PAPER = attendee({
  id: "33333333-3333-4333-8333-333333333333",
  name: "Paper Person",
  email: "paper@example.com",
  waiver_status: "signed",
  waiver_signed_method: "paper",
  waiver_signed_at: "2026-08-07T14:30:00.000Z",
});

const DIGITAL = attendee({
  id: "44444444-4444-4444-8444-444444444444",
  name: "Digital Person",
  email: "digital@example.com",
  waiver_status: "signed",
  waiver_signed_at: "2026-08-01T10:00:00.000Z",
  smartwaiver_id: "sw-abc-123",
});

/** Renders with the "all" filter active so signed rows are visible too. */
async function renderDashboard(attendees: ReturnType<typeof attendee>[]) {
  invoke.mockResolvedValue({
    data: { attendees, purchases: [], minorWaivers: [], unmatchedWaivers: [] },
    error: null,
  });
  render(<AdminDashboard />);
  await waitFor(() => expect(invoke).toHaveBeenCalled());
  fireEvent.click(screen.getByRole("button", { name: /^all/i }));
  return screen.getByText(attendees[0].name);
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
  it("distinguishes a paper waiver from a Smartwaiver signature", async () => {
    await renderDashboard([PAPER, DIGITAL]);

    expect(within(rowFor("Paper Person")).getByText(/Signed · paper/)).toBeTruthy();
    expect(within(rowFor("Digital Person")).getByText(/^Signed$/)).toBeTruthy();
  });
});

describe("available actions", () => {
  it("offers both resend and a paper mark on a pending attendee", async () => {
    await renderDashboard([attendee()]);
    const row = within(rowFor("Pending Person"));

    expect(row.getByRole("button", { name: /resend/i })).toBeTruthy();
    expect(row.getByRole("button", { name: /mark signed \(paper\)/i })).toBeTruthy();
  });

  it("offers undo on a paper mark but never on a Smartwaiver signature", async () => {
    await renderDashboard([PAPER, DIGITAL]);

    expect(within(rowFor("Paper Person")).getByRole("button", { name: /undo/i })).toBeTruthy();
    expect(within(rowFor("Digital Person")).queryByRole("button", { name: /undo/i })).toBeNull();
  });
});

describe("confirming a paper mark", () => {
  it("asks first, then sends the attendee id and the new status", async () => {
    await renderDashboard([attendee()]);

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
      const call = invoke.mock.calls.at(-1);
      expect(call?.[1]).toMatchObject({
        body: {
          action: "set-waiver-status",
          attendeeId: "11111111-1111-4111-8111-111111111111",
          status: "signed",
        },
      });
    });
  });

  it("sends nothing when the dialog is cancelled", async () => {
    await renderDashboard([attendee()]);

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
          attendeeId: PAPER.id,
          status: "pending",
        },
      });
    });
  });
});
