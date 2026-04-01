import { useState } from "react";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import WaiverDialog from "./WaiverDialog";

const EARLY_BIRD_CUTOFF = new Date("2026-05-02T03:59:59Z");

const ticketTiers = [
  {
    name: "Early Bird",
    price: "CA$299",
    originalPrice: "CA$333",
    description: "Limited availability – secure your spot at a special rate",
    features: [
      "Full weekend access (Fri–Sun)",
      "All ceremonies & workshops",
      "Live music & performances",
      "Fire circle gathering",
      "Welcome gift bundle",
    ],
    popular: true,
    cta: "Reserve Early Bird",
    ticketType: "early-bird",
    expiryNotice: "Available until May 1, 2026 at 11:59 PM EST",
  },
  {
    name: "Regular Admission",
    price: "CA$333",
    originalPrice: null,
    description: "Standard admission to the full Earth Song experience",
    features: [
      "Full weekend access (Fri–Sun)",
      "All ceremonies & workshops",
      "Live music & performances",
      "Fire circle gathering",
    ],
    popular: false,
    cta: "Get Tickets",
    ticketType: "regular-admission",
    expiryNotice: null,
  },
  {
    name: "Saturday Day Pass",
    price: "CA$150",
    originalPrice: null,
    description: "A one-day pass for Saturday only",
    features: [
      "Saturday access (9am–10pm)",
      "All Saturday ceremonies & workshops",
      "Live music & performances",
    ],
    popular: false,
    cta: "Get Day Pass",
    ticketType: "saturday-day-pass",
    expiryNotice: null,
  },
];

const TicketsSection = () => {
  const [waiverOpen, setWaiverOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<{
    type: string;
    label: string;
  } | null>(null);

  const now = new Date();
  const earlyBirdExpired = now >= EARLY_BIRD_CUTOFF;

  const handleTicketClick = (ticketType: string, ticketLabel: string) => {
    setSelectedTicket({ type: ticketType, label: ticketLabel });
    setWaiverOpen(true);
  };

  // Filter out expired Early Bird
  const visibleTiers = ticketTiers.filter(
    (tier) => !(tier.ticketType === "early-bird" && earlyBirdExpired)
  );

  return (
    <section id="tickets" className="py-20 md:py-28 bg-background">
      <div className="container mx-auto px-4">
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

        <div
          className={`grid grid-cols-1 ${
            visibleTiers.length === 3 ? "md:grid-cols-3" : "md:grid-cols-2"
          } gap-6 md:gap-8 max-w-5xl mx-auto`}
        >
          {visibleTiers.map((tier, index) => (
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
                {tier.expiryNotice && (
                  <p className="text-xs text-amber-700 bg-amber-50 rounded-md px-2 py-1 mt-2 inline-block">
                    {tier.expiryNotice}
                  </p>
                )}
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
                  data-testid={`button-ticket-${tier.name.toLowerCase().replace(" ", "-")}`}
                  onClick={() => handleTicketClick(tier.ticketType, tier.name)}
                  className={`w-full h-12 rounded-lg text-base transition-all duration-300 ${
                    tier.popular
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary text-secondary-foreground"
                  }`}
                >
                  {tier.cta}
                </Button>
                <p className="text-sm text-center mt-2 opacity-70">
                  Pay in installments available at checkout via Klarna or Afterpay
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

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

      {selectedTicket && (
        <WaiverDialog
          open={waiverOpen}
          onOpenChange={setWaiverOpen}
          ticketType={selectedTicket.type}
          ticketLabel={selectedTicket.label}
        />
      )}
    </section>
  );
};

export default TicketsSection;
