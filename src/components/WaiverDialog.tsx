import { useState, useRef, useCallback } from "react";
import { Loader as Loader2, ChevronDown } from "lucide-react";
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

const CHECKOUT_URL =
  "https://uxsastmtftysfwjgvkzu.supabase.co/functions/v1/create-checkout";
const ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV4c2FzdG10ZnR5c2Z3amd2a3p1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI4Mjk2NjcsImV4cCI6MjA4ODQwNTY2N30.UE9NZ-Hh2f3noz12LbbUNiBallPyxEVEhE6FOfvHsWs";

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
  const [section1Checked, setSection1Checked] = useState(false);
  const [section2Checked, setSection2Checked] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showScrollHint, setShowScrollHint] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  const canSubmit =
    name.trim() !== "" &&
    email.trim() !== "" &&
    agreed &&
    section1Checked &&
    section2Checked;

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 100;
    if (nearBottom) setShowScrollHint(false);
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
      const res = await fetch(CHECKOUT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${ANON_KEY}`,
          apikey: ANON_KEY,
        },
        body: JSON.stringify({
          ticketType,
          customerEmail: email.trim(),
          customerName: name.trim(),
          customerPhone: phone.trim(),
          customerAddress: address.trim(),
        }),
      });

      const result = await res.json();

      if (!res.ok) {
        throw new Error(result?.error || `Server error (${res.status})`);
      }

      if (!result?.url) {
        throw new Error("No checkout URL returned");
      }

      window.location.href = result.url;
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
    setSection1Checked(false);
    setSection2Checked(false);
    setShowScrollHint(true);
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) resetForm();
    onOpenChange(nextOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden p-0 gap-0 flex flex-col">
        <div className="sticky top-0 z-10 bg-background px-6 pt-6 pb-4 border-b border-border flex-shrink-0">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl text-primary">
              Liability Waiver Agreement
            </DialogTitle>
            <DialogDescription>
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
          className="flex-1 overflow-y-auto overscroll-contain px-6 pt-4 pb-2 relative"
          style={{ WebkitOverflowScrolling: "touch", maxHeight: "400px" }}
        >
          <WaiverContent
            showCheckboxes
            section1Checked={section1Checked}
            onSection1Change={setSection1Checked}
            section2Checked={section2Checked}
            onSection2Change={setSection2Checked}
          />
          <div className="h-4" />
          {/* Bottom fade gradient */}
          {showScrollHint && (
            <div className="sticky bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-background to-transparent pointer-events-none" />
          )}
        </div>

        {showScrollHint && (
          <div className="flex justify-center py-1 flex-shrink-0">
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

        <div className="border-t border-border px-6 py-5 space-y-4 flex-shrink-0">
          <h4 className="font-serif text-base font-semibold text-primary">
            Attendee Information
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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

          <div className="flex items-start gap-3 pt-1">
            <Checkbox
              id="waiver-agree"
              checked={agreed}
              onCheckedChange={(checked) => setAgreed(checked === true)}
              className="mt-0.5"
            />
            <Label
              htmlFor="waiver-agree"
              className="text-sm leading-snug cursor-pointer text-foreground/80"
            >
              I have read this Agreement in full, understand its contents, and
              voluntarily agree to its terms. I understand that I am waiving
              certain legal rights, including the right to bring legal claims.
            </Label>
          </div>

          <Button
            onClick={handleProceed}
            disabled={!canSubmit || loading}
            className="w-full h-12 rounded-lg text-base bg-primary text-primary-foreground"
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
