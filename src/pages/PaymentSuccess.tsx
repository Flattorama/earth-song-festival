import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { CircleCheck as CheckCircle, Loader as Loader2, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Purchase {
  id: string;
  buyer_name: string;
  buyer_email: string;
  ticket_type: string;
  quantity: number;
}

interface AttendeeForm {
  name: string;
  email: string;
  phone: string;
}

const PaymentSuccess = () => {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get("session_id");

  const [purchase, setPurchase] = useState<Purchase | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [attendees, setAttendees] = useState<AttendeeForm[]>([]);

  useEffect(() => {
    if (!sessionId) {
      setLoading(false);
      return;
    }

    const fetchPurchase = async () => {
      const { data, error } = await (supabase as any)
        .from("purchases")
        .select("id, buyer_name, buyer_email, ticket_type, quantity")
        .eq("stripe_session_id", sessionId)
        .maybeSingle();

      if (error) {
        console.error("Failed to load purchase:", error);
      }

      if (data) {
        setPurchase(data);
        if (data.quantity > 1) {
          setAttendees(
            Array.from({ length: data.quantity - 1 }, () => ({
              name: "",
              email: "",
              phone: "",
            }))
          );
        }
      }
      setLoading(false);
    };

    fetchPurchase();
  }, [sessionId]);

  const updateAttendee = (index: number, field: keyof AttendeeForm, value: string) => {
    setAttendees((prev) =>
      prev.map((a, i) => (i === index ? { ...a, [field]: value } : a))
    );
  };

  const allAttendeesValid = attendees.every(
    (a) => a.name.trim() !== "" && a.email.trim() !== ""
  );

  const handleSubmitAttendees = async () => {
    if (!purchase || !allAttendeesValid) return;
    setSubmitting(true);

    try {
      const buyerRow = {
        purchase_id: purchase.id,
        name: purchase.buyer_name,
        email: purchase.buyer_email,
        phone: "",
        is_buyer: true,
        waiver_status: "signed",
        waiver_signed_at: new Date().toISOString(),
      };

      const additionalRows = attendees.map((a) => ({
        purchase_id: purchase.id,
        name: a.name.trim(),
        email: a.email.trim(),
        phone: a.phone.trim(),
        is_buyer: false,
        waiver_status: "pending",
      }));

      const { error: insertError } = await (supabase as any)
        .from("attendees")
        .insert([buyerRow, ...additionalRows]);

      if (insertError) throw insertError;

      const { data: inserted } = await (supabase as any)
        .from("attendees")
        .select("id, name, email, waiver_token")
        .eq("purchase_id", purchase.id)
        .eq("is_buyer", false);

      if (inserted && inserted.length > 0) {
        await supabase.functions.invoke("send-waiver-emails", {
          body: {
            attendees: inserted.map((att: any) => ({
              name: att.name,
              email: att.email,
              waiver_token: att.waiver_token,
            })),
            ticketType: purchase.ticket_type,
          },
        });
      }

      setSubmitted(true);
      toast.success("Attendee information saved. Waiver emails have been sent.");
    } catch (err) {
      console.error("Submit attendees error:", err);
      toast.error("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSingleTicketMount = async () => {
    if (!purchase) return;
    const { data: existing } = await (supabase as any)
      .from("attendees")
      .select("id")
      .eq("purchase_id", purchase.id)
      .limit(1);

    if (existing && existing.length > 0) return;

    await (supabase as any).from("attendees").insert({
      purchase_id: purchase.id,
      name: purchase.buyer_name,
      email: purchase.buyer_email,
      phone: "",
      is_buyer: true,
      waiver_status: "signed",
      waiver_signed_at: new Date().toISOString(),
    });
  };

  useEffect(() => {
    if (purchase && purchase.quantity === 1) {
      handleSingleTicketMount();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [purchase]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!purchase || purchase.quantity <= 1 || submitted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <CheckCircle className="w-16 h-16 text-accent mx-auto mb-6" />
          <h1 className="font-serif text-3xl md:text-4xl font-semibold text-primary mb-4">
            You're In!
          </h1>
          <p className="text-foreground/80 text-lg mb-4">
            Your ticket{purchase && purchase.quantity > 1 ? "s" : ""} for the
            Earth Song Festival Retreat{" "}
            {purchase && purchase.quantity > 1 ? "have" : "has"} been secured.
          </p>
          {submitted && purchase && purchase.quantity > 1 && (
            <p className="text-foreground/60 text-sm mb-6">
              Each additional attendee has been sent an email with a link to
              complete the required liability waiver. Tickets will be issued once
              all waivers are signed.
            </p>
          )}
          {!submitted && (
            <p className="text-foreground/80 text-base mb-8">
              Check your email for confirmation details.
            </p>
          )}
          <Link to="/">
            <Button className="bg-primary text-primary-foreground h-12 px-8 rounded-lg">
              Back to Home
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-10">
          <CheckCircle className="w-12 h-12 text-accent mx-auto mb-4" />
          <h1 className="font-serif text-3xl md:text-4xl font-semibold text-primary mb-3">
            Payment Successful
          </h1>
          <p className="text-foreground/80 text-lg">
            You purchased {purchase.quantity} tickets. Please enter the details
            for each additional attendee below.
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-border p-6 mb-6">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center text-accent text-sm font-semibold">
              1
            </div>
            <div>
              <p className="font-semibold text-foreground">{purchase.buyer_name}</p>
              <p className="text-sm text-muted-foreground">{purchase.buyer_email}</p>
            </div>
            <span className="ml-auto text-xs font-medium text-accent bg-accent/10 px-2.5 py-1 rounded-full">
              Waiver Signed
            </span>
          </div>
        </div>

        <div className="space-y-6">
          {attendees.map((att, index) => (
            <div key={index} className="bg-white rounded-2xl border border-border p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-sm font-semibold">
                  {index + 2}
                </div>
                <h3 className="font-serif text-lg font-semibold text-primary">
                  Attendee {index + 2}
                </h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>
                    Full Name <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    placeholder="Full name"
                    value={att.name}
                    onChange={(e) => updateAttendee(index, "name", e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>
                    Email <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    type="email"
                    placeholder="attendee@example.com"
                    value={att.email}
                    onChange={(e) => updateAttendee(index, "email", e.target.value)}
                  />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label>Phone</Label>
                  <Input
                    type="tel"
                    placeholder="(optional)"
                    value={att.phone}
                    onChange={(e) => updateAttendee(index, "phone", e.target.value)}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-8 bg-white/60 rounded-xl border border-border p-4">
          <div className="flex items-start gap-3">
            <Users className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
            <p className="text-sm text-foreground/70">
              Each attendee listed above will receive an email with a link to
              complete the required liability waiver. Tickets are only issued
              after the waiver is signed.
            </p>
          </div>
        </div>

        <Button
          onClick={handleSubmitAttendees}
          disabled={!allAttendeesValid || submitting}
          className="w-full h-12 rounded-lg text-base bg-primary text-primary-foreground mt-6"
        >
          {submitting ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            "Submit & Send Waiver Emails"
          )}
        </Button>
      </div>
    </div>
  );
};

export default PaymentSuccess;
