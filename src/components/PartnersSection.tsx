import stillLifeImg from "@/assets/Gemini_Generated_Image_nhnridnhnridnhnr.png";
import happyRockImg from "@/assets/HappyRockHolisticsLogo.png";

const partners = [
  {
    name: "Still Life Retreat & Lake",
    url: "https://www.instagram.com/still_life_retreat_and_lake",
    logo: stillLifeImg,
  },
  {
    name: "Happy Rock Holistics",
    url: "https://happyrockholistics.co/",
    logo: happyRockImg,
  },
];

const PartnersSection = () => {
  return (
    <section id="partners" className="py-16 md:py-20 bg-background border-t border-border">
      <div className="container mx-auto px-4">
        <div className="text-center">
          <p className="text-small-caps text-muted-foreground tracking-[0.2em] text-sm mb-10">
            IN COLLABORATION WITH
          </p>
          <div className="flex flex-wrap justify-center items-center gap-12 md:gap-20">
            {partners.map((partner, index) => (
              <a
                key={index}
                href={partner.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group transition-transform hover:scale-105"
                data-testid={`link-partner-${index}`}
                aria-label={partner.name}
              >
                <img
                  src={partner.logo}
                  alt={partner.name}
                  className="h-20 md:h-24 w-auto object-contain opacity-90 group-hover:opacity-100 transition-opacity"
                />
              </a>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default PartnersSection;
