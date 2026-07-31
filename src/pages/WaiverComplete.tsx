import { Link, useSearchParams } from "react-router-dom";
import { CircleCheck as CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

const WAIVER_URL = "https://waiver.smartwaiver.com/w/9cayh4ucp8knmwybehfh4a/web/";

/**
 * Where Smartwaiver sends people after they sign. The transactionId it appends
 * is shown as a reference if present, but nothing on this page depends on it --
 * a participant who lands here without one is still finished.
 */
const WaiverComplete = () => {
  const [searchParams] = useSearchParams();
  const transactionId = searchParams.get("transactionId");

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-12">
      <div className="text-center max-w-md">
        <CheckCircle className="w-16 h-16 text-accent mx-auto mb-6" />
        <h1 className="font-serif text-3xl md:text-4xl font-semibold text-primary mb-4">
          Waiver received
        </h1>
        <p className="text-foreground/80 text-lg mb-6">
          You're all set. See you August 7.
        </p>

        <div className="bg-white/60 rounded-xl border border-border p-4 text-left mb-8">
          <p className="text-sm text-foreground/70">
            Bought youth tickets? Make sure each child was added as a participant
            on the form. If you missed one,{" "}
            <a
              href={WAIVER_URL}
              className="text-primary underline underline-offset-2 hover:opacity-80"
            >
              sign again
            </a>
            .
          </p>
          <p className="text-sm text-foreground/70 mt-3">
            Every adult attending needs their own waiver. If you bought tickets
            for other adults, please forward them the link from your email.
          </p>
        </div>

        <Link to="/">
          <Button className="bg-primary text-primary-foreground h-12 px-8 rounded-lg">
            Back to Home
          </Button>
        </Link>

        {transactionId && (
          <p className="text-xs text-muted-foreground mt-8">
            Reference: {transactionId}
          </p>
        )}
      </div>
    </div>
  );
};

export default WaiverComplete;
