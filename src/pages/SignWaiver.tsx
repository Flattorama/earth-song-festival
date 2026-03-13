import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import {
  CircleCheck as CheckCircle,
  Loader as Loader2,
  CircleAlert as AlertCircle,
  ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import WaiverContent from "@/components/WaiverContent";
import SignaturePad from "@/components/SignaturePad";
import { useRef, useCallback } from "react";

interface AttendeeData {
  id: string;
  name: string;
  email: string;
  phone: string;
  waiver_status: string;
}

const SignWaiver = () => {
  const { token } = useParams<{ token: string }>();
  const [attendee, setAttendee] = useState<AttendeeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [signed, setSigned] = useState(false);
  const [alreadySigned, setAlreadySigned] = useState(false);
  const [notFound, setNotFound] = useState(false);

  const [legalName, setLegalName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [section1Checked, setSection1Checked] = useState(false);
  const [section2Checked, setSection2Checked] = useState(false);
  const [signatureData, setSignatureData] = useState("");
  const [showScrollHint, setShowScrollHint] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 100;
    if (nearBottom) setShowScrollHint(false);
  }, []);

  const scrollDown = () => {
    scrollRef.current?.scrollBy({ top: 200, behavior: "smooth" });
  };

  useEffect(() => {
    if (!token) {
      setNotFound(true);
      setLoading(false);
      return;
    }

    const fetchAttendee = async () => {
      const { data, error } = await (supabase as any)
        .from("attendees")
        .select("id, name, email, phone, waiver_status")
        .eq("waiver_token", token)
        .maybeSingle();

      if (error || !data) {
        setNotFound(true);
      } else if (data.waiver_status === "signed") {
        setAttendee(data);
        setAlreadySigned(true);
      } else {
        setAttendee(data);
        setLegalName(data.name);
        setEmail(data.email);
        setPhone(data.phone || "");
      }
      setLoading(false);
    };

    fetchAttendee();
  }, [token]);

  const canSubmit =
    legalName.trim() !== "" &&
    email.trim() !== "" &&
    agreed &&
    section1Checked &&
    section2Checked &&
    signatureData !== "";

  const handleSign = async () => {
    if (!canSubmit || !attendee) return;
    setSubmitting(true);

    try {
      const { error } = await (supabase as any)
        .from("attendees")
        .update({
          name: legalName.trim(),
          email: email.trim(),
          phone: phone.trim(),
          waiver_status: "signed",
          waiver_signed_at: new Date().toISOString(),
          waiver_ip_address: "",
        })
        .eq("id", attendee.id);

      if (error) throw error;

      setSigned(true);
      toast.success("Waiver signed successfully.");
    } catch (err) {
      console.error("Waiver sign error:", err);
      toast.error("Unable to submit waiver. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <AlertCircle className="w-16 h-16 text-destructive mx-auto mb-6" />
          <h1 className="font-serif text-3xl font-semibold text-primary mb-4">
            Waiver Not Found
          </h1>
          <p className="text-foreground/80 text-lg">
            This waiver link is invalid or has expired. Please check the link in
            your email and try again.
          </p>
        </div>
      </div>
    );
  }

  if (alreadySigned || signed) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <CheckCircle className="w-16 h-16 text-accent mx-auto mb-6" />
          <h1 className="font-serif text-3xl font-semibold text-primary mb-4">
            Waiver Complete
          </h1>
          <p className="text-foreground/80 text-lg">
            {alreadySigned
              ? "This waiver has already been signed. No further action is needed."
              : "Your waiver has been signed successfully. Your ticket will be issued shortly."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="font-serif text-3xl md:text-4xl font-semibold text-primary mb-2">
            Liability Waiver Agreement
          </h1>
          <p className="text-foreground/60">
            Earth Song Festival Retreat — August 7–9, 2026
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-border overflow-hidden">
          <div className="px-6 pt-6 pb-2">
            <p className="text-sm text-foreground/70">
              Hi{" "}
              <span className="font-medium text-foreground">
                {attendee?.name}
              </span>
              , please read the waiver below, confirm your information, and
              provide your digital signature.
            </p>
          </div>

          <div className="px-6 relative">
            <div
              ref={scrollRef}
              onScroll={handleScroll}
              className="overflow-y-auto mt-4 pr-2"
              style={{
                maxHeight: "400px",
                WebkitOverflowScrolling: "touch",
              }}
            >
              <WaiverContent
                showCheckboxes
                section1Checked={section1Checked}
                onSection1Change={setSection1Checked}
                section2Checked={section2Checked}
                onSection2Change={setSection2Checked}
              />
              <div className="h-4" />
            </div>
            {showScrollHint && (
              <>
                <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-white to-transparent pointer-events-none" />
                <div className="flex justify-center py-1">
                  <button
                    type="button"
                    onClick={scrollDown}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary text-primary-foreground text-xs font-medium shadow-lg hover:opacity-90 transition-opacity"
                  >
                    <ChevronDown className="w-3.5 h-3.5" />
                    Scroll to read full agreement
                  </button>
                </div>
              </>
            )}
          </div>

          <div className="border-t border-border px-6 py-6 space-y-4">
            <h4 className="font-serif text-base font-semibold text-primary">
              Your Information
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>
                  Legal Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  placeholder="Your full legal name"
                  value={legalName}
                  onChange={(e) => setLegalName(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>
                  Email <span className="text-destructive">*</span>
                </Label>
                <Input
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Phone</Label>
                <Input
                  type="tel"
                  placeholder="(optional)"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Date</Label>
                <Input
                  value={new Date().toLocaleDateString("en-CA")}
                  disabled
                  className="bg-muted"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>
                Digital Signature <span className="text-destructive">*</span>
              </Label>
              <SignaturePad onSignatureChange={setSignatureData} />
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
              onClick={handleSign}
              disabled={!canSubmit || submitting}
              className="w-full h-12 rounded-lg text-base bg-primary text-primary-foreground"
            >
              {submitting ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                "Sign Waiver"
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SignWaiver;
