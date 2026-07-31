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

describe("adult quantity", () => {
  const addAdult = () => fireEvent.click(screen.getByLabelText("One more adult ticket"));
  const removeAdult = () => fireEvent.click(screen.getByLabelText("One fewer adult ticket"));

  it("starts at one adult with no extra fields", () => {
    renderPicker();
    expect(screen.getByTestId("adult-count").textContent).toBe("1");
    expect(screen.queryByTestId("adult-name-2")).toBeNull();
  });

  it("adds a name and email field per additional adult", () => {
    renderPicker();
    addAdult();
    expect(screen.getByTestId("adult-count").textContent).toBe("2");
    expect(screen.getByTestId("adult-name-2")).toBeTruthy();
    expect(screen.getByTestId("adult-email-2")).toBeTruthy();

    addAdult();
    expect(screen.getByTestId("adult-name-3")).toBeTruthy();
  });

  it("drops the trailing rows when the quantity shrinks", () => {
    renderPicker();
    addAdult();
    addAdult();
    fireEvent.change(screen.getByTestId("adult-email-3"), {
      target: { value: "third@example.com" },
    });

    removeAdult();

    expect(screen.getByTestId("adult-count").textContent).toBe("2");
    expect(screen.queryByTestId("adult-email-3")).toBeNull();
  });

  it("blocks submit until every additional adult is complete", () => {
    renderPicker();
    fillContact();
    addAdult();

    const submit = screen.getByText("Continue to Payment");
    expect((submit as HTMLButtonElement).disabled).toBe(true);

    fireEvent.change(screen.getByTestId("adult-name-2"), { target: { value: "Ada" } });
    expect((submit as HTMLButtonElement).disabled).toBe(true);

    fireEvent.change(screen.getByTestId("adult-email-2"), {
      target: { value: "ada@example.com" },
    });
    expect((submit as HTMLButtonElement).disabled).toBe(false);
  });

  it("rejects a malformed email", () => {
    renderPicker();
    fillContact();
    addAdult();
    fireEvent.change(screen.getByTestId("adult-name-2"), { target: { value: "Ada" } });
    fireEvent.change(screen.getByTestId("adult-email-2"), { target: { value: "nope" } });

    expect((screen.getByText("Continue to Payment") as HTMLButtonElement).disabled).toBe(true);
  });

  // attendees has UNIQUE (purchase_id, email), so a shared address would sell
  // more tickets than adults tracked.
  it("flags an email already used by the buyer", () => {
    renderPicker();
    fillContact();
    addAdult();
    fireEvent.change(screen.getByTestId("adult-name-2"), { target: { value: "Ada" } });
    fireEvent.change(screen.getByTestId("adult-email-2"), {
      target: { value: "BUYER@example.com" },
    });

    expect(screen.getByTestId("duplicate-email-error")).toBeTruthy();
    expect((screen.getByText("Continue to Payment") as HTMLButtonElement).disabled).toBe(true);
  });

  it("flags two additional adults sharing an email", () => {
    renderPicker();
    fillContact();
    addAdult();
    addAdult();
    fireEvent.change(screen.getByTestId("adult-name-2"), { target: { value: "Ada" } });
    fireEvent.change(screen.getByTestId("adult-email-2"), { target: { value: "same@example.com" } });
    fireEvent.change(screen.getByTestId("adult-name-3"), { target: { value: "Alan" } });
    fireEvent.change(screen.getByTestId("adult-email-3"), { target: { value: "same@example.com" } });

    expect(screen.getByTestId("duplicate-email-error")).toBeTruthy();
  });

  it("sends quantity 1 and an empty list for a solo buyer, exactly as before", async () => {
    renderPicker();
    fillContact();
    fireEvent.click(screen.getByText("Continue to Payment"));
    await vi.waitFor(() => expect(invoke).toHaveBeenCalled());

    const body = bodyOfLastCheckout();
    expect(body.adultQuantity).toBe(1);
    expect(body.additionalAdults).toEqual([]);
  });

  it("sends the whole party when there are three adults", async () => {
    renderPicker();
    fillContact();
    addAdult();
    addAdult();
    fireEvent.change(screen.getByTestId("adult-name-2"), { target: { value: " Ada Lovelace " } });
    fireEvent.change(screen.getByTestId("adult-email-2"), { target: { value: " ada@example.com " } });
    fireEvent.change(screen.getByTestId("adult-name-3"), { target: { value: "Alan Turing" } });
    fireEvent.change(screen.getByTestId("adult-email-3"), { target: { value: "alan@example.com" } });

    fireEvent.click(screen.getByText("Continue to Payment"));
    await vi.waitFor(() => expect(invoke).toHaveBeenCalled());

    const body = bodyOfLastCheckout();
    expect(body.adultQuantity).toBe(3);
    expect(body.additionalAdults).toEqual([
      { name: "Ada Lovelace", email: "ada@example.com" },
      { name: "Alan Turing", email: "alan@example.com" },
    ]);
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
