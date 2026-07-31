import { useState, useCallback } from "react";
import { Loader as Loader2, CheckCircle2, Minus, Plus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  forcedYouthPassType,
  MAX_YOUTH_PER_BAND,
  YOUTH_AGE_BANDS,
  youthPricing,
  youthSubtotal,
  type YouthAgeBand,
  type YouthCounts,
  type YouthPassType,
} from "@/data/pricing";

interface TicketPickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ticketType: string;
  ticketLabel: string;
}

type ReferralStatus = "idle" | "validating" | "valid" | "invalid";

const TicketPicker = ({
  open,
  onOpenChange,
  ticketType,
  ticketLabel,
}: TicketPickerProps) => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [referralCode, setReferralCode] = useState("");
  const [referralStatus, setReferralStatus] = useState<ReferralStatus>("idle");
  const [referralFacilitator, setReferralFacilitator] = useState("");
  const [bringingMinors, setBringingMinors] = useState(false);
  const [counts, setCounts] = useState<Record<YouthAgeBand, number>>({
    "13-18": 0,
    "8-12": 0,
    "2-7": 0,
    "under-2": 0,
  });
  const [loading, setLoading] = useState(false);

  // A day-pass buyer can only add youth passes for the same day. Weekend
  // buyers get the weekend youth pricing.
  const passType: YouthPassType = forcedYouthPassType[ticketType] ?? "weekend";
  const pass = youthPricing[passType];

  const youthTotal = youthSubtotal({ [passType]: counts } as YouthCounts);
  const youthCount = YOUTH_AGE_BANDS.reduce(
    (sum, band) => sum + counts[band],
    0,
  );
  const canSubmit = name.trim() !== "" && email.trim() !== "" && !loading;

  // Steps from the previous count rather than the rendered one: two quick taps
  // land in the same React batch, and computing from a captured value would
  // make the second one a no-op.
  const adjustBand = (band: YouthAgeBand, delta: number) => {
    setCounts((prev) => ({
      ...prev,
      [band]: Math.min(Math.max(prev[band] + delta, 0), MAX_YOUTH_PER_BAND),
    }));
  };

  /**
   * Answering "No" clears any counts already entered. Without this, someone who
   * added two children and then changed their mind would still be charged for
   * them, because the collapsed section keeps its state.
   */
  const setBringingMinorsAnswer = (answer: boolean) => {
    setBringingMinors(answer);
    if (!answer) setCounts({ "13-18": 0, "8-12": 0, "2-7": 0, "under-2": 0 });
  };

  const validateReferralCode = useCallback(async (code: string) => {
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) {
      setReferralStatus("idle");
      setReferralFacilitator("");
      return;
    }
    setReferralStatus("validating");
    const { data, error } = await supabase
      .from("referral_codes")
      .select("facilitator_name")
      .eq("code", trimmed)
      .eq("is_active", true)
      .maybeSingle();

    if (error || !data) {
      setReferralStatus("invalid");
      setReferralFacilitator("");
    } else {
      setReferralStatus("valid");
      setReferralFacilitator(data.facilitator_name);
    }
  }, []);

  const resetForm = () => {
    setName("");
    setEmail("");
    setReferralCode("");
    setReferralStatus("idle");
    setReferralFacilitator("");
    setBringingMinors(false);
    setCounts({ "13-18": 0, "8-12": 0, "2-7": 0, "under-2": 0 });
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) resetForm();
    onOpenChange(nextOpen);
  };

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setLoading(true);

    try {
      // Bands left at zero are omitted entirely: create-checkout rejects a
      // count of 0 rather than ignoring it. Answering "No" to the minors
      // question is also honoured here, so a collapsed section can never
      // contribute a charge.
      const bands: Partial<Record<YouthAgeBand, number>> = {};
      if (bringingMinors) {
        for (const band of YOUTH_AGE_BANDS) {
          if (counts[band] > 0) bands[band] = counts[band];
        }
      }
      const youthCounts: YouthCounts =
        Object.keys(bands).length > 0 ? { [passType]: bands } : {};

      const { data, error } = await supabase.functions.invoke(
        "create-checkout",
        {
          body: {
            ticketType,
            customerName: name.trim(),
            customerEmail: email.trim(),
            referralCode:
              referralStatus === "valid"
                ? referralCode.trim().toUpperCase()
                : undefined,
            youthCounts,
          },
        },
      );

      if (error) {
        throw new Error(
          data && typeof data === "object" && "error" in data
            ? String(data.error)
            : error.message,
        );
      }

      if (!data?.url) {
        throw new Error("No checkout URL returned");
      }

      window.location.href = data.url;
    } catch (err: unknown) {
      console.error("Checkout error:", err);
      const message =
        err && typeof err === "object" && "message" in err
          ? (err as { message: string }).message
          : "Unknown error";
      toast.error(`Unable to start checkout: ${message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="flex max-h-[90dvh] w-[calc(100vw-1rem)] max-w-lg flex-col gap-0 overflow-hidden p-0 sm:w-full">
        <div className="flex-shrink-0 border-b border-border px-4 pb-4 pt-5 sm:px-6">
          <DialogHeader>
            <DialogTitle className="font-serif text-lg text-primary sm:text-xl">
              {ticketLabel}
            </DialogTitle>
            <DialogDescription className="text-xs leading-snug sm:text-sm">
              After payment we'll email you a waiver to sign — one per adult, and
              you can add your kids on the same form.
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4 sm:px-6">
          <div className="space-y-1.5">
            <Label htmlFor="picker-name">
              Full Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="picker-name"
              placeholder="Your full name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="picker-email">
              Email <span className="text-destructive">*</span>
            </Label>
            <Input
              id="picker-email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Your waiver link goes here, so double-check it.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="picker-referral">Referral Code (optional)</Label>
            <Input
              id="picker-referral"
              placeholder="e.g. SHANNON"
              value={referralCode}
              onChange={(e) => {
                const val = e.target.value.toUpperCase();
                setReferralCode(val);
                if (!val.trim()) {
                  setReferralStatus("idle");
                  setReferralFacilitator("");
                }
              }}
              onBlur={() => validateReferralCode(referralCode)}
            />
            {referralStatus === "validating" && (
              <p className="text-sm text-muted-foreground">Checking code...</p>
            )}
            {referralStatus === "valid" && (
              <p className="flex items-center gap-1.5 text-sm text-accent">
                <CheckCircle2 className="h-4 w-4" />
                Referred by {referralFacilitator}
              </p>
            )}
            {referralStatus === "invalid" && (
              <p className="text-sm text-destructive">
                We don't recognise that code.
              </p>
            )}
          </div>

          <div className="rounded-xl border border-border bg-muted/30 p-3 sm:p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <h4 className="font-serif text-sm font-semibold text-primary sm:text-base">
                  Are any children coming with you?
                </h4>
                <p className="mt-1 text-xs text-foreground/70 sm:text-sm">
                  Anyone under 18 needs their own ticket.
                </p>
              </div>
              <div
                className="flex flex-shrink-0 gap-2"
                role="group"
                aria-label="Are any children coming with you?"
              >
                <Button
                  type="button"
                  variant={bringingMinors ? "outline" : "default"}
                  size="sm"
                  aria-pressed={!bringingMinors}
                  data-testid="minors-no"
                  onClick={() => setBringingMinorsAnswer(false)}
                >
                  No
                </Button>
                <Button
                  type="button"
                  variant={bringingMinors ? "default" : "outline"}
                  size="sm"
                  aria-pressed={bringingMinors}
                  data-testid="minors-yes"
                  onClick={() => setBringingMinorsAnswer(true)}
                >
                  Yes
                </Button>
              </div>
            </div>

            {bringingMinors && (
              <>
                <p className="mt-4 text-xs text-foreground/70 sm:text-sm">
                  {pass.label} pricing. Children must attend with an
                  accompanying adult, and you'll add each name on the waiver
                  after payment.
                </p>

                <div className="mt-3 space-y-2">
                  {YOUTH_AGE_BANDS.map((band) => {
                    const tier = pass.tiers[band];
                    const value = counts[band];
                    return (
                      <div
                        key={band}
                        className="flex items-center justify-between gap-3 rounded-lg border border-border bg-white px-3 py-2"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground">
                            {tier.label}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {tier.amount === 0 ? "Free" : `CA$${tier.amount}`}
                          </p>
                        </div>
                        <div className="flex flex-shrink-0 items-center gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            className="h-8 w-8"
                            aria-label={`Remove one ${tier.label} ticket`}
                            disabled={value === 0}
                            onClick={() => adjustBand(band, -1)}
                          >
                            <Minus className="h-4 w-4" />
                          </Button>
                          <span
                            className="w-6 text-center text-sm font-semibold tabular-nums"
                            data-testid={`youth-count-${band}`}
                          >
                            {value}
                          </span>
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            className="h-8 w-8"
                            aria-label={`Add one ${tier.label} ticket`}
                            disabled={value >= MAX_YOUTH_PER_BAND}
                            onClick={() => adjustBand(band, +1)}
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {youthCount > 0 && (
                  <div className="mt-3 rounded-lg bg-primary/5 p-3 text-sm text-foreground/80">
                    {youthCount} youth ticket{youthCount > 1 ? "s" : ""} —
                    subtotal{" "}
                    <span className="font-semibold text-primary">
                      CA${youthTotal}
                    </span>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        <div className="flex-shrink-0 border-t border-border bg-background px-4 py-3 sm:px-6 sm:py-4">
          <Button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="h-11 w-full rounded-lg bg-primary text-base text-primary-foreground sm:h-12"
          >
            {loading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              "Continue to Payment"
            )}
          </Button>
          {!canSubmit && !loading && (
            <p className="mt-2 text-center text-xs text-muted-foreground">
              Enter your name and email to continue.
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default TicketPicker;
