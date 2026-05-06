import { ChevronDown } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { facilitators } from "@/data/facilitators";

const FacilitatorsSection = () => {
  return (
    <section id="facilitators" className="py-20 md:py-28 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <p className="text-small-caps text-accent tracking-[0.2em] text-sm mb-4">
            OUR GUIDES
          </p>
          <h2 className="font-serif text-3xl md:text-4xl lg:text-5xl font-semibold mb-6 text-foreground">
            The Hearts Behind Earth Song
          </h2>
          <p className="text-foreground/70 text-lg max-w-2xl mx-auto">
            Our facilitators are experienced practitioners, artists, and healers
            who bring warmth, wisdom, and deep care to everything they offer.
          </p>
        </div>

        <Accordion
          type="multiple"
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto"
        >
          {facilitators.map((facilitator, index) => (
            <AccordionItem
              key={index}
              value={`facilitator-${index}`}
              className="group bg-card rounded-2xl border border-border shadow-sm hover:shadow-md transition-shadow"
              data-testid={`card-facilitator-${index}`}
            >
              <AccordionTrigger className="flex-col items-center text-center p-6 hover:no-underline [&>svg]:hidden">
                {facilitator.image ? (
                  <div className="w-28 h-28 rounded-full overflow-hidden border-4 border-gold/30 mb-4 flex-shrink-0">
                    <img
                      src={facilitator.image}
                      alt={facilitator.name}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  </div>
                ) : (
                  <div className="w-28 h-28 rounded-full border-4 border-gold/30 mb-4 flex-shrink-0 bg-accent/10 flex items-center justify-center">
                    <span className="font-serif text-2xl text-accent">
                      {facilitator.name.charAt(0)}
                    </span>
                  </div>
                )}
                <h3 className="font-serif text-xl font-semibold text-foreground mb-1">
                  {facilitator.name}
                </h3>
                <p className="text-accent text-sm font-medium mb-2">
                  {facilitator.role}
                </p>
                <span className="text-accent/60 text-xs flex items-center gap-1">
                  <ChevronDown className="h-3 w-3 transition-transform duration-200 group-data-[state=open]:rotate-180" />
                  Read more
                </span>
              </AccordionTrigger>
              <AccordionContent className="px-6 pb-6">
                <div className="text-foreground/70 text-sm leading-relaxed space-y-3 text-left border-t border-border/50 pt-4">
                  {facilitator.bio.split("\n\n").map((paragraph, i) => (
                    <p key={i}>{paragraph}</p>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
};

export default FacilitatorsSection;
