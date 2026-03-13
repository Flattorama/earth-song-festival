import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const faqItems = [
  {
    question: "What time does the weekend begin and end?",
    answer: "Gates open Friday at 2:00 PM for arrival and settling in. Opening ceremony begins Friday evening. The weekend concludes with closing ceremony Sunday around 3:00 PM. We encourage you to arrive early and stay for the full experience.",
  },
  {
    question: "What's included in my ticket?",
    answer: "Your ticket includes full access to all workshops, ceremonies, and performances throughout the weekend, plus camping, parking, and lake access. Food is not included in the ticket price, but healthy, nourishing meals will be lovingly prepared from local ingredients by Chef Doris and available for purchase on-site. Herbal tea and coffee vendors will also be available — please bring cash for food and vendor purchases. This is an alcohol-free gathering.",
  },
  {
    question: "Is camping available?",
    answer: "Earth Song is a weekend gathering with on-site camping included. Still Life Retreat & Lake also offers accommodation options for those who prefer more comfort. Details will be sent to ticket holders closer to the event.",
  },
  {
    question: "What should I bring?",
    answer: "Bring comfortable clothes you can move in, layers for changing temperatures, a water bottle, a journal if you like, a cushion or blanket for sitting, and an open heart. A full packing list will be provided to all ticket holders.",
  },
  {
    question: "Is the event alcohol-free?",
    answer: "Yes. Earth Song is an alcohol-free and substance-free gathering. We believe in experiencing the fullness of ceremony and connection with clarity and presence. This is a core value of our space.",
  },
  {
    question: 'What does "Leave No Trace" mean?',
    answer: "We are guests on this beautiful land and committed to leaving it better than we found it. This means packing out what you pack in, respecting the environment, and participating in our collective clean-up at the end of the weekend.",
  },
  {
    question: "Is this event accessible?",
    answer: "We're committed to making Earth Song as accessible as possible. The terrain at Still Life Retreat includes grass, trails, and natural ground. If you have specific accessibility needs or questions, please reach out to us directly and we'll do our best to accommodate you.",
  },
  {
    question: "Can I bring my children?",
    answer: "Earth Song is designed as an adult gathering. We ask that guests make childcare arrangements and come ready to fully immerse themselves in the experience.",
  },
  {
    question: "What's the refund policy?",
    answer: "Tickets are non-refundable but are transferable. If you can no longer attend, you may transfer your ticket to a friend. Please contact us to arrange the transfer.",
  },
  {
    question: "How do I get there?",
    answer: "Detailed directions and parking information will be sent to all ticket holders closer to the event. Still Life Retreat & Lake is located in a beautiful natural setting with ample parking available.",
  },
  {
    question: "I have more questions!",
    answer: "We're happy to help. Reach out to us at hello@earthsongfestival.com and we'll get back to you as soon as possible.",
  },
];

const FAQSection = () => {
  return (
    <section id="faq" className="py-20 md:py-28 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <p className="text-small-caps text-accent tracking-[0.2em] text-sm mb-4">
            QUESTIONS & ANSWERS
          </p>
          <h2 className="font-serif text-3xl md:text-4xl lg:text-5xl font-semibold mb-6 text-foreground">
            Everything You Need to Know
          </h2>
        </div>

        <div className="max-w-3xl mx-auto">
          <Accordion type="single" collapsible className="space-y-4">
            {faqItems.map((item, index) => (
              <AccordionItem
                key={index}
                value={`item-${index}`}
                className="bg-card rounded-xl border border-border px-6 data-[state=open]:shadow-md transition-shadow"
                data-testid={`accordion-faq-${index}`}
              >
                <AccordionTrigger className="text-left font-serif text-lg font-medium text-foreground hover:text-accent hover:no-underline py-5">
                  {item.question}
                </AccordionTrigger>
                <AccordionContent className="text-foreground/70 leading-relaxed pb-5">
                  {item.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </div>
    </section>
  );
};

export default FAQSection;
