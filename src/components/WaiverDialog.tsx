import { useState } from "react";
import { Loader as Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import WaiverContent from "./WaiverContent";

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

  const canSubmit = name.trim() !== "" && email.trim() !== "" && agreed;

  const handleProceed = async () => {
    if (!canSubmit) return;
    setLoading(true);

    try {
      const { error: insertError } = await supabase
        .from("waiver_acceptances")
        .insert({
          attendee_name: name.trim(),
          attendee_email: email.trim(),
          attendee_phone: phone.trim(),
          attendee_address: address.trim(),
          ticket_type: ticketType,
          waiver_version: "v1.0_2026-08-07",
        });

      if (insertError) throw insertError;

      const { data, error } = await supabase.functions.invoke(
        "create-checkout",
        {
          body: {
            ticketType,
            customerEmail: email.trim(),
            customerName: name.trim(),
          },
        }
      );

      if (error) throw error;
      if (!data?.url) {
        throw new Error(data?.error || "No checkout URL returned");
      }

      window.location.href = data.url;
    } catch (err) {
      console.error("Waiver/checkout error:", err);
      toast.error("Unable to start checkout. Please try again.");
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
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) resetForm();
    onOpenChange(nextOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-6 pt-6 pb-4">
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

        <ScrollArea className="flex-1 px-6 max-h-[40vh]">
          <WaiverContent />
          <div className="h-4" />
        </ScrollArea>

        <div className="border-t border-border px-6 py-5 space-y-4">
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
