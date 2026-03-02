import { useState } from "react";
import { Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const ticketTiers = [
  {
    name: "Early Bird",
    price: "$195",
    originalPrice: "$245",
    description: "Limited availability – secure your spot at a special rate",
    features: [
      "Full day access (9am – 10pm)",
      "All ceremonies & workshops",
      "Live music & performances",
      "Organic meals & refreshments",
      "Fire circle gathering",
      "Welcome gift bundle",
    ],
    popular: true,
    cta: "Reserve Early Bird",
    ticketType: "early-bird",
  },
  {
    name: "Regular Admission",
    price: "$245",
    originalPrice: null,
    description: "Standard admission to the full Earth Song experience",
    features: [
      "Full day access (9am – 10pm)",
      "All ceremonies & workshops",
      "Live music & performances",
      "Organic meals & refreshments",
      "Fire circle gathering",
    ],
    popular: false,
    cta: "Get Tickets",
    ticketType: "regular-admission",
  },
];

const TicketsSection = () => {
  const [loadingTier, setLoadingTier] = useState<string | null>(null);

  const handleCheckout = async (ticketType: string) => {
    setLoadingTier(ticketType);
    try {
      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: { ticketType },
      });

      if (error) throw error;
      if (data?.url) {
        window.open(data.url, "_blank");
      }
    } catch (err: any) {
      console.error("Checkout error:", err);
      toast.error("Unable to start checkout. Please try again.");
    } finally {
      setLoadingTier(null);
    }
  };

  return (
    <section id="tickets" className="py-20 md:py-28 bg-background">
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <div className="text-center mb-16">
          <p className="text-small-caps text-accent tracking-[0.2em] text-sm mb-4">
            Join Us
          </p>
          <h2 className="font-serif text-3xl md:text-4xl lg:text-5xl font-semibold text-primary mb-6">
            Secure Your Place
          </h2>
          <p className="text-foreground/80 text-lg max-w-2xl mx-auto">
            Space is intentionally limited to preserve the intimacy of our gathering. 
            Early registration is encouraged.
          </p>
        </div>

        {/* Ticket Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 max-w-4xl mx-auto">
          {ticketTiers.map((tier, index) => (
            <Card
              key={index}
              className={`relative overflow-hidden rounded-2xl border-2 transition-all duration-300 hover:shadow-xl ${
                tier.popular
                  ? "border-primary bg-white shadow-lg"
                  : "border-border bg-white"
              }`}
            >
              {tier.popular && (
                <div className="absolute top-4 right-4">
                  <span className="bg-gold text-gold-foreground text-xs font-semibold px-3 py-1 rounded-full">
                    Best Value
                  </span>
                </div>
              )}
              <CardHeader className="pb-4">
                <h3 className="font-serif text-2xl font-semibold text-primary">
                  {tier.name}
                </h3>
                <div className="flex items-baseline gap-2 mt-2">
                  <span className="font-serif text-4xl font-bold text-foreground">
                    {tier.price}
                  </span>
                  {tier.originalPrice && (
                    <span className="text-muted-foreground line-through">
                      {tier.originalPrice}
                    </span>
                  )}
                </div>
                <p className="text-muted-foreground mt-2">{tier.description}</p>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3 mb-6">
                  {tier.features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <Check className="w-5 h-5 text-accent flex-shrink-0 mt-0.5" />
                      <span className="text-foreground/80">{feature}</span>
                    </li>
                  ))}
                </ul>
                <Button
                  data-testid={`button-ticket-${tier.name.toLowerCase().replace(' ', '-')}`}
                  onClick={() => handleCheckout(tier.ticketType)}
                  disabled={loadingTier !== null}
                  className={`w-full h-12 rounded-lg text-base transition-all duration-300 ${
                    tier.popular
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary text-secondary-foreground"
                  }`}
                >
                  {loadingTier === tier.ticketType ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    tier.cta
                  )}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Additional Info */}
        <div className="text-center mt-12 space-y-2">
          <p className="text-muted-foreground">
            <span className="font-semibold text-foreground">Limited to 150 souls</span> — 
            First come, first served
          </p>
          <p className="text-muted-foreground text-sm">
            Payment plans available. All sales final. Tickets are transferable.
          </p>
        </div>
      </div>
    </section>
  );
};

export default TicketsSection;
