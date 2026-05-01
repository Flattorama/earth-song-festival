import { useState, useRef, useCallback, useEffect } from "react";
import { Loader as Loader2, ChevronDown, CheckCircle2 } from "lucide-react";
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
import { toast } from "sonner";
import WaiverContent from "./WaiverContent";
import { supabase } from "@/integrations/supabase/client";

interface WaiverDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ticketType: string;
  ticketLabel: string;
}

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
  const scrollRef = useRef<HTMLDivElement>(null);

  const canSubmit = name.trim() !== "" && email.trim() !== "" && agreed;

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
              Please read the waiver below, fill in your information, and accept
              before proceeding to purchase your{" "}
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
              I have read this Agreement in full, understand its contents, and
              voluntarily agree to its terms. I understand that I am waiving
              certain legal rights, including the right to bring legal claims.
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
