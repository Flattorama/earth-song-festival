import { useState, useRef, useCallback } from "react";
import { Loader as Loader2, ChevronDown, CheckCircle2, Plus, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import WaiverContent from "./WaiverContent";
import MinorWaiverContent from "./MinorWaiverContent";
import { supabase } from "@/integrations/supabase/client";

interface WaiverDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ticketType: string;
  ticketLabel: string;
}

const youthPricing = {
  weekend: {
    label: "Full Weekend Pass",
    tiers: {
      "13-18": { label: "Ages 13–18", amount: 150 },
      "8-12": { label: "Ages 8–12", amount: 100 },
      "2-7": { label: "Ages 2–7", amount: 50 },
      "under-2": { label: "Under 2", amount: 0 },
    },
  },
  day: {
    label: "Day Pass",
    tiers: {
      "13-18": { label: "Ages 13–18", amount: 100 },
      "8-12": { label: "Ages 8–12", amount: 50 },
      "2-7": { label: "Ages 2–7", amount: 25 },
      "under-2": { label: "Under 2", amount: 0 },
    },
  },
} as const;

type YouthPassType = keyof typeof youthPricing;
type YouthAgeBand = keyof (typeof youthPricing)[YouthPassType]["tiers"];

interface YouthTicketForm {
  id: string;
  minorName: string;
  minorDateOfBirth: string;
  passType: YouthPassType;
  ageBand: YouthAgeBand;
}

const createYouthTicket = (): YouthTicketForm => ({
  id: crypto.randomUUID(),
  minorName: "",
  minorDateOfBirth: "",
  passType: "weekend",
  ageBand: "13-18",
});

const WaiverDialog = ({
  open,
  onOpenChange,
  ticketType,
  ticketLabel,
}: WaiverDialogProps) => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showScrollHint, setShowScrollHint] = useState(true);
  const [referralCode, setReferralCode] = useState("");
  const [referralStatus, setReferralStatus] = useState<
    "idle" | "validating" | "valid" | "invalid"
  >("idle");
  const [referralFacilitator, setReferralFacilitator] = useState("");
  const [youthTickets, setYouthTickets] = useState<YouthTicketForm[]>([]);
  const [guardianInitialsRisk, setGuardianInitialsRisk] = useState("");
  const [guardianInitialsIndemnity, setGuardianInitialsIndemnity] = useState("");
  const [minorAgreed, setMinorAgreed] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const hasYouthTickets = youthTickets.length > 0;
  const youthTicketsValid = youthTickets.every(
    (ticket) => ticket.minorName.trim() !== "" && ticket.minorDateOfBirth !== ""
  );
  const minorWaiverValid =
    !hasYouthTickets ||
    (youthTicketsValid &&
      guardianInitialsRisk.trim() !== "" &&
      guardianInitialsIndemnity.trim() !== "" &&
      minorAgreed);
  const canSubmit = name.trim() !== "" && email.trim() !== "" && agreed && minorWaiverValid;
  const youthTotal = youthTickets.reduce(
    (total, ticket) => total + youthPricing[ticket.passType].tiers[ticket.ageBand].amount,
    0
  );

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 100;
    if (nearBottom) setShowScrollHint(false);
  }, []);

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

  const scrollToBottom = () => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  };

  const handleProceed = async () => {
    if (!canSubmit) return;
    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: {
          ticketType,
          customerEmail: email.trim(),
          customerName: name.trim(),
          customerPhone: phone.trim(),
          customerAddress: address.trim(),
          referralCode: referralStatus === "valid" ? referralCode.trim().toUpperCase() : undefined,
          minorGuardianInitialsRisk: hasYouthTickets ? guardianInitialsRisk.trim() : undefined,
          minorGuardianInitialsIndemnity: hasYouthTickets
            ? guardianInitialsIndemnity.trim()
            : undefined,
          minorWaiverAccepted: hasYouthTickets ? minorAgreed : undefined,
          minorTickets: youthTickets.map((ticket) => ({
            minorName: ticket.minorName.trim(),
            minorDateOfBirth: ticket.minorDateOfBirth,
            passType: ticket.passType,
            ageBand: ticket.ageBand,
          })),
        },
      });

      if (error) {
        throw new Error(
          data && typeof data === "object" && "error" in data
            ? String(data.error)
            : error.message
        );
      }

      if (!data?.url) {
        throw new Error("No checkout URL returned");
      }

      window.location.href = data.url;
    } catch (err: unknown) {
      console.error("Waiver/checkout error:", err);
      const message =
        err && typeof err === "object" && "message" in err
          ? (err as { message: string }).message
          : "Unknown error";
      toast.error(`Unable to start checkout: ${message}`);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setName("");
    setEmail("");
    setPhone("");
    setAddress("");
    setAgreed(false);
    setShowScrollHint(true);
    setReferralCode("");
    setReferralStatus("idle");
    setReferralFacilitator("");
    setYouthTickets([]);
    setGuardianInitialsRisk("");
    setGuardianInitialsIndemnity("");
    setMinorAgreed(false);
  };

  const addYouthTicket = () => {
    setYouthTickets((prev) => [...prev, createYouthTicket()]);
  };

  const updateYouthTicket = <K extends keyof YouthTicketForm>(
    id: string,
    field: K,
    value: YouthTicketForm[K]
  ) => {
    setYouthTickets((prev) =>
      prev.map((ticket) => (ticket.id === id ? { ...ticket, [field]: value } : ticket))
    );
  };

  const removeYouthTicket = (id: string) => {
    setYouthTickets((prev) => prev.filter((ticket) => ticket.id !== id));
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) resetForm();
    onOpenChange(nextOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="flex max-h-[96dvh] w-[calc(100vw-1rem)] max-w-2xl flex-col gap-0 overflow-hidden p-0 sm:max-h-[90vh] sm:w-full">
        <div className="sticky top-0 z-10 flex-shrink-0 border-b border-border bg-background px-4 pb-3 pt-4 sm:px-6 sm:pb-4 sm:pt-6">
          <DialogHeader>
            <DialogTitle className="font-serif text-lg text-primary sm:text-xl">
              Liability Waiver Agreement
            </DialogTitle>
            <DialogDescription className="text-xs leading-snug sm:text-sm">
              Please read the waiver below, fill in your information, add any
              youth tickets attending with you, and accept before purchasing your{" "}
              <span className="font-medium text-foreground">{ticketLabel}</span>{" "}
              ticket.
            </DialogDescription>
          </DialogHeader>
        </div>

        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="relative min-h-[34dvh] flex-1 overflow-y-auto overscroll-contain px-4 pb-2 pt-3 sm:min-h-0 sm:px-6 sm:pt-4"
          style={{ WebkitOverflowScrolling: "touch" }}
        >
          <WaiverContent />
          {hasYouthTickets && (
            <>
              <hr className="my-6 border-border" />
              <MinorWaiverContent />
            </>
          )}
          <div className="h-4" />
          {/* Bottom fade gradient */}
          {showScrollHint && (
            <div className="sticky bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-background to-transparent pointer-events-none" />
          )}
        </div>

        {showScrollHint && (
          <div className="flex flex-shrink-0 justify-center py-1">
            <button
              type="button"
              onClick={scrollToBottom}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary text-primary-foreground text-xs font-medium shadow-lg hover:opacity-90 transition-opacity"
            >
              <ChevronDown className="w-3.5 h-3.5" />
              Scroll to read full agreement
            </button>
          </div>
        )}

        <div className="max-h-[50dvh] flex-shrink-0 space-y-3 overflow-y-auto border-t border-border px-4 py-3 sm:max-h-none sm:space-y-4 sm:overflow-visible sm:px-6 sm:py-5">
          <h4 className="font-serif text-sm font-semibold text-primary sm:text-base">
            Attendee Information
          </h4>
          <div className="grid grid-cols-2 gap-2 sm:gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="waiver-name">
                Full Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="waiver-name"
                placeholder="Your full name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="waiver-email">
                Email <span className="text-destructive">*</span>
              </Label>
              <Input
                id="waiver-email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="waiver-phone">Phone</Label>
              <Input
                id="waiver-phone"
                type="tel"
                placeholder="(optional)"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="waiver-address">Address</Label>
              <Input
                id="waiver-address"
                placeholder="(optional)"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="referral-code">Referral Code (optional)</Label>
            <Input
              id="referral-code"
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
              <p className="text-sm text-accent flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4" />
                Referred by {referralFacilitator}
              </p>
            )}
          </div>

          <div className="rounded-xl border border-border bg-muted/30 p-3 sm:p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h4 className="font-serif text-sm font-semibold text-primary sm:text-base">
                  Youth / Minor Tickets
                </h4>
                <p className="mt-1 text-xs text-foreground/70 sm:text-sm">
                  Youth tickets must be purchased with this accompanying adult.
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addYouthTicket}
                className="shrink-0"
              >
                <Plus className="mr-1.5 h-4 w-4" />
                Add Youth Ticket
              </Button>
            </div>

            {hasYouthTickets && (
              <div className="mt-4 space-y-4">
                {youthTickets.map((ticket, index) => {
                  const tier = youthPricing[ticket.passType].tiers[ticket.ageBand];
                  return (
                    <div key={ticket.id} className="rounded-lg border border-border bg-white p-3">
                      <div className="mb-3 flex items-center justify-between gap-3">
                        <p className="text-sm font-medium text-foreground">
                          Youth Attendee {index + 1}
                        </p>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeYouthTicket(ticket.id)}
                          className="h-8 px-2 text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="grid grid-cols-2 gap-2 sm:gap-3">
                        <div className="col-span-2 space-y-1.5 sm:col-span-1">
                          <Label htmlFor={`minor-name-${ticket.id}`}>
                            Minor Name <span className="text-destructive">*</span>
                          </Label>
                          <Input
                            id={`minor-name-${ticket.id}`}
                            placeholder="Minor's full name"
                            value={ticket.minorName}
                            onChange={(event) =>
                              updateYouthTicket(ticket.id, "minorName", event.target.value)
                            }
                          />
                        </div>
                        <div className="col-span-2 space-y-1.5 sm:col-span-1">
                          <Label htmlFor={`minor-dob-${ticket.id}`}>
                            Date of Birth <span className="text-destructive">*</span>
                          </Label>
                          <Input
                            id={`minor-dob-${ticket.id}`}
                            type="date"
                            value={ticket.minorDateOfBirth}
                            onChange={(event) =>
                              updateYouthTicket(ticket.id, "minorDateOfBirth", event.target.value)
                            }
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label>Pass Type</Label>
                          <Select
                            value={ticket.passType}
                            onValueChange={(value: YouthPassType) =>
                              updateYouthTicket(ticket.id, "passType", value)
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="weekend">Full Weekend</SelectItem>
                              <SelectItem value="day">Day Pass</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1.5">
                          <Label>Age Range</Label>
                          <Select
                            value={ticket.ageBand}
                            onValueChange={(value: YouthAgeBand) =>
                              updateYouthTicket(ticket.id, "ageBand", value)
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="13-18">Ages 13–18</SelectItem>
                              <SelectItem value="8-12">Ages 8–12</SelectItem>
                              <SelectItem value="2-7">Ages 2–7</SelectItem>
                              <SelectItem value="under-2">Under 2</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <p className="mt-3 text-sm font-medium text-primary">
                        {youthPricing[ticket.passType].label} — {tier.label}:{" "}
                        {tier.amount === 0 ? "Free" : `CA$${tier.amount}`}
                      </p>
                    </div>
                  );
                })}

                <div className="rounded-lg bg-primary/5 p-3 text-sm text-foreground/80">
                  Youth ticket subtotal:{" "}
                  <span className="font-semibold text-primary">CA${youthTotal}</span>
                </div>

                <div className="grid grid-cols-2 gap-2 sm:gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="guardian-risk-initials">
                      Risk Initials <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="guardian-risk-initials"
                      placeholder="Initials"
                      value={guardianInitialsRisk}
                      onChange={(event) =>
                        setGuardianInitialsRisk(event.target.value.toUpperCase())
                      }
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="guardian-indemnity-initials">
                      Indemnity Initials <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="guardian-indemnity-initials"
                      placeholder="Initials"
                      value={guardianInitialsIndemnity}
                      onChange={(event) =>
                        setGuardianInitialsIndemnity(event.target.value.toUpperCase())
                      }
                    />
                  </div>
                </div>

                <div className="flex items-start gap-2 sm:gap-3">
                  <Checkbox
                    id="minor-waiver-agree"
                    checked={minorAgreed}
                    onCheckedChange={(checked) => setMinorAgreed(checked === true)}
                    className="mt-0.5"
                  />
                  <Label
                    htmlFor="minor-waiver-agree"
                    className="cursor-pointer text-xs leading-snug text-foreground/80 sm:text-sm"
                  >
                    I am the parent/legal guardian of the minor attendee(s) named
                    above and accept the Minor Attendee Waiver Addendum on behalf
                    of myself and the minor attendee(s).
                  </Label>
                </div>
              </div>
            )}
          </div>

          <div className="flex items-start gap-2 pt-1 sm:gap-3">
            <Checkbox
              id="waiver-agree"
              checked={agreed}
              onCheckedChange={(checked) => setAgreed(checked === true)}
              className="mt-0.5"
            />
            <Label
              htmlFor="waiver-agree"
              className="cursor-pointer text-xs leading-snug text-foreground/80 sm:text-sm"
            >
              I have read the applicable agreement{hasYouthTickets ? "s" : ""}{" "}
              in full, understand {hasYouthTickets ? "their" : "its"} contents,
              and voluntarily agree to {hasYouthTickets ? "their" : "its"} terms.
              I understand that I am waiving certain legal rights, including the
              right to bring legal claims.
            </Label>
          </div>

          <Button
            onClick={handleProceed}
            disabled={!canSubmit || loading}
            className="h-11 w-full rounded-lg bg-primary text-base text-primary-foreground sm:h-12"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              "Proceed to Payment"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default WaiverDialog;
