import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { CircleCheck as CheckCircle, Loader as Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

const TEMPLATE_ID = "9cayh4ucp8knmwybehfh4a";
const CONTACT_EMAIL = "hello@earthsongfestival.com";

interface Purchase {
  id: string;
  buyer_email: string;
  smartwaiver_url?: string | null;
}

interface PurchaseResponse {
  purchase: Purchase | null;
  error?: string;
}

/** The webhook may not have stored the prefilled link yet; auto_tag still ties
 *  the signature back to this purchase. */
const fallbackWaiverUrl = (purchaseId: string) =>
  `https://waiver.smartwaiver.com/w/${TEMPLATE_ID}/web/?auto_tag=${purchaseId.replace(/-/g, "")}`;

const PaymentSuccess = () => {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get("session_id");

  const [purchase, setPurchase] = useState<Purchase | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!sessionId) {
      setLoading(false);
      return;
    }

    const fetchPurchase = async () => {
      const { data, error } = await supabase.functions.invoke<PurchaseResponse>(
        "get-purchase",
        { body: { sessionId } }
      );

      if (error || data?.error) {
        console.error("Failed to load purchase:", error || data?.error);
      }
      if (data?.purchase) setPurchase(data.purchase);
      setLoading(false);
    };

    fetchPurchase();
  }, [sessionId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const waiverUrl =
    purchase?.smartwaiver_url ||
    (purchase ? fallbackWaiverUrl(purchase.id) : `https://waiver.smartwaiver.com/w/${TEMPLATE_ID}/web/`);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-12">
      <div className="text-center max-w-md">
        <CheckCircle className="w-16 h-16 text-accent mx-auto mb-6" />
        <h1 className="font-serif text-3xl md:text-4xl font-semibold text-primary mb-4">
          Payment received
        </h1>
        <p className="text-foreground/80 text-lg mb-2">
          {purchase?.buyer_email ? (
            <>
              We've emailed <span className="font-medium">{purchase.buyer_email}</span> a
              link to your waiver.
            </>
          ) : (
            <>We've emailed you a link to your waiver.</>
          )}
        </p>
        <p className="text-foreground/80 mb-8">
          Every adult attending must sign one. It takes about two minutes.
        </p>

        <a href={waiverUrl} target="_blank" rel="noopener noreferrer">
          <Button className="bg-primary text-primary-foreground h-12 px-8 rounded-lg w-full">
            Sign my waiver now
          </Button>
        </a>

        <div className="bg-white/60 rounded-xl border border-border p-4 text-left mt-8 space-y-3">
          <p className="text-sm text-foreground/70">
            <span className="font-semibold text-foreground">Bought tickets for other adults?</span>{" "}
            Forward them your waiver email. No one can sign on another adult's
            behalf, so each of them needs their own.
          </p>
          <p className="text-sm text-foreground/70">
            <span className="font-semibold text-foreground">Bringing children?</span>{" "}
            On the first screen select both "Adult" and "Minor(s)", then add each
            child as a participant. Selecting only "Minor(s)" signs for them but
            not for you.
          </p>
          <p className="text-sm text-foreground/70">
            <span className="font-semibold text-foreground">Didn't get the email?</span>{" "}
            Check your spam folder for waiver.smartwaiver.com, or contact us at{" "}
            <a
              href={`mailto:${CONTACT_EMAIL}`}
              className="text-primary underline underline-offset-2"
            >
              {CONTACT_EMAIL}
            </a>
            .
          </p>
        </div>

        <Link to="/">
          <Button variant="outline" className="h-12 px-8 rounded-lg mt-8">
            Back to Home
          </Button>
        </Link>
      </div>
    </div>
  );
};

export default PaymentSuccess;
