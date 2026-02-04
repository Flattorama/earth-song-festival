const partners = [
  {
    name: "Still Life Retreat & Lake",
    url: "#",
  },
  {
    name: "Happy Rock Holistics",
    url: "#",
  },
];

const PartnersSection = () => {
  return (
    <section id="partners" className="py-16 md:py-20 bg-background border-t border-border">
      <div className="container mx-auto px-4">
        <div className="text-center">
          <p className="text-small-caps text-muted-foreground tracking-[0.2em] text-sm mb-8">
            IN COLLABORATION WITH
          </p>
          <div className="flex flex-wrap justify-center items-center gap-8 md:gap-16">
            {partners.map((partner, index) => (
              <a
                key={index}
                href={partner.url}
                className="group text-center"
                data-testid={`link-partner-${index}`}
              >
                <div className="w-32 h-16 md:w-40 md:h-20 bg-muted rounded-lg flex items-center justify-center transition-all group-hover:bg-accent/10 group-hover:scale-105">
                  <span className="font-serif text-sm md:text-base text-muted-foreground group-hover:text-accent transition-colors text-center px-2">
                    {partner.name}
                  </span>
                </div>
              </a>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default PartnersSection;
