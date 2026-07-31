import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import TicketPicker from "@/components/TicketPicker";

// The picker only talks to Supabase for referral validation and checkout, so a
// thin stub keeps these tests offline.
const invoke = vi.fn();
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    functions: { invoke: (...args: unknown[]) => invoke(...args) },
    from: () => ({
      select: () => ({
        eq: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null, error: null }) }) }),
      }),
    }),
  },
}));

vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn(), info: vi.fn() } }));

const renderPicker = (ticketType = "regular-admission", ticketLabel = "Regular Admission") =>
  render(
    <TicketPicker open onOpenChange={() => {}} ticketType={ticketType} ticketLabel={ticketLabel} />,
  );

const fillContact = () => {
  fireEvent.change(screen.getByPlaceholderText("Your full name"), {
    target: { value: "Test Buyer" },
  });
  fireEvent.change(screen.getByPlaceholderText("you@example.com"), {
    target: { value: "buyer@example.com" },
  });
};

const bodyOfLastCheckout = () => {
  const call = invoke.mock.calls.at(-1);
  return (call?.[1] as { body: Record<string, unknown> }).body;
};

beforeEach(() => {
  invoke.mockReset();
  invoke.mockResolvedValue({ data: { url: "https://checkout.stripe.com/test" }, error: null });
  // jsdom has no navigation; keep handleSubmit's redirect from throwing.
  Object.defineProperty(window, "location", {
    writable: true,
    value: { href: "" } as Location,
  });
});

describe("youth section is hidden until asked for", () => {
  it("starts collapsed with No selected and no counters on screen", () => {
    renderPicker();

    expect(screen.getByText("Are any children coming with you?")).toBeTruthy();
    expect(screen.getByTestId("minors-no").getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByTestId("minors-yes").getAttribute("aria-pressed")).toBe("false");
    expect(screen.queryByTestId("youth-count-13-18")).toBeNull();
  });

  it("reveals the counters when Yes is chosen", () => {
    renderPicker();
    fireEvent.click(screen.getByTestId("minors-yes"));

    for (const band of ["13-18", "8-12", "2-7", "under-2"]) {
      expect(screen.getByTestId(`youth-count-${band}`)).toBeTruthy();
    }
    expect(screen.getByTestId("minors-yes").getAttribute("aria-pressed")).toBe("true");
  });

  it("hides them again when the answer changes back to No", () => {
    renderPicker();
    fireEvent.click(screen.getByTestId("minors-yes"));
    expect(screen.getByTestId("youth-count-13-18")).toBeTruthy();

    fireEvent.click(screen.getByTestId("minors-no"));
    expect(screen.queryByTestId("youth-count-13-18")).toBeNull();
  });
});

describe("changing the answer to No cannot leave a charge behind", () => {
  const addOne = (band: string) => {
    const row = screen.getByTestId(`youth-count-${band}`).parentElement!;
    fireEvent.click(row.querySelectorAll("button")[1]);
  };

  it("clears counts that were entered before answering No", () => {
    renderPicker();
    fireEvent.click(screen.getByTestId("minors-yes"));
    addOne("13-18");
    addOne("13-18");
    expect(screen.getByTestId("youth-count-13-18").textContent).toBe("2");

    fireEvent.click(screen.getByTestId("minors-no"));
    fireEvent.click(screen.getByTestId("minors-yes"));

    expect(screen.getByTestId("youth-count-13-18").textContent).toBe("0");
  });

  it("sends an empty youthCounts after backing out, so nobody is billed", async () => {
    renderPicker();
    fillContact();
    fireEvent.click(screen.getByTestId("minors-yes"));
    addOne("13-18");
    addOne("2-7");
    fireEvent.click(screen.getByTestId("minors-no"));

    fireEvent.click(screen.getByText("Continue to Payment"));
    await vi.waitFor(() => expect(invoke).toHaveBeenCalled());

    expect(bodyOfLastCheckout().youthCounts).toEqual({});
  });
});

describe("the Yes path still prices correctly", () => {
  const addOne = (band: string) => {
    const row = screen.getByTestId(`youth-count-${band}`).parentElement!;
    fireEvent.click(row.querySelectorAll("button")[1]);
  };

  it("sends weekend counts for a full-weekend ticket", async () => {
    renderPicker("regular-admission");
    fillContact();
    fireEvent.click(screen.getByTestId("minors-yes"));
    addOne("13-18");
    addOne("13-18");
    addOne("under-2");

    fireEvent.click(screen.getByText("Continue to Payment"));
    await vi.waitFor(() => expect(invoke).toHaveBeenCalled());

    // Bands left at zero are omitted: create-checkout rejects a count of 0.
    expect(bodyOfLastCheckout().youthCounts).toEqual({
      weekend: { "13-18": 2, "under-2": 1 },
    });
  });

  it('keys a Saturday day pass as "day", not "saturday"', async () => {
    renderPicker("saturday-day-pass", "Saturday Day Pass");
    fillContact();
    fireEvent.click(screen.getByTestId("minors-yes"));

    // Saturday charges 100 for 13-18 where Friday and Sunday charge 75.
    expect(screen.getByText("CA$100")).toBeTruthy();

    const row = screen.getByTestId("youth-count-13-18").parentElement!;
    fireEvent.click(row.querySelectorAll("button")[1]);
    fireEvent.click(screen.getByText("Continue to Payment"));
    await vi.waitFor(() => expect(invoke).toHaveBeenCalled());

    expect(bodyOfLastCheckout().youthCounts).toEqual({ day: { "13-18": 1 } });
  });

  it("two rapid taps count as two tickets, not one", async () => {
    renderPicker();
    fillContact();
    fireEvent.click(screen.getByTestId("minors-yes"));
    const row = screen.getByTestId("youth-count-8-12").parentElement!;
    const plus = row.querySelectorAll("button")[1];
    fireEvent.click(plus);
    fireEvent.click(plus);

    expect(screen.getByTestId("youth-count-8-12").textContent).toBe("2");
  });
});
