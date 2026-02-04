import { Button } from "@/components/ui/button";
import heroBg from "@/assets/hero-bg.jpg";

const HeroSection = () => {
  const handleScrollToTickets = () => {
    const element = document.querySelector("#tickets");
    if (element) {
      const offset = 80;
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.scrollY - offset;
      window.scrollTo({
        top: offsetPosition,
        behavior: "smooth",
      });
    }
  };

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background Image */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${heroBg})` }}
      />
      
      {/* Dark Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black/70" />

      {/* Content */}
      <div className="relative z-10 container mx-auto px-4 text-center text-primary-foreground">
        {/* Pre-headline */}
        <p className="text-small-caps text-gold tracking-[0.3em] text-sm md:text-base mb-4 animate-fade-in">
          A Ceremonial Gathering
        </p>

        {/* Main Title */}
        <h1 className="font-serif text-4xl md:text-6xl lg:text-7xl font-semibold mb-6 animate-fade-in [animation-delay:0.1s] opacity-0">
          <span className="block">EARTH SONG</span>
          <span className="block text-2xl md:text-3xl lg:text-4xl font-normal mt-2 italic">
            Festival Retreat
          </span>
        </h1>

        {/* Date & Location */}
        <p className="text-lg md:text-xl mb-4 animate-fade-in [animation-delay:0.2s] opacity-0">
          August 8, 2026 <span className="mx-3 text-gold">|</span> Still Life Retreat & Lake
        </p>

        {/* Tagline */}
        <p className="font-serif italic text-lg md:text-xl text-primary-foreground/90 max-w-2xl mx-auto mb-8 animate-fade-in [animation-delay:0.3s] opacity-0">
          "Come together under open skies to dance, heal, and celebrate the sacred rhythms of life."
        </p>

        {/* CTA Button */}
        <div className="animate-fade-in [animation-delay:0.4s] opacity-0">
          <Button
            onClick={handleScrollToTickets}
            size="lg"
            className="bg-primary hover:bg-accent text-primary-foreground text-lg px-8 py-6 rounded-full shadow-lg transition-all duration-300 hover:scale-105"
          >
            Secure Your Spot
          </Button>
        </div>

        {/* Badges */}
        <div className="mt-12 flex flex-wrap justify-center gap-4 md:gap-6 text-sm text-primary-foreground/80 animate-fade-in [animation-delay:0.5s] opacity-0">
          <span className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-gold" />
            Alcohol-Free
          </span>
          <span className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-gold" />
            Leave No Trace
          </span>
          <span className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-gold" />
            Limited Capacity
          </span>
        </div>
      </div>

      {/* Scroll Indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
        <div className="w-6 h-10 rounded-full border-2 border-primary-foreground/50 flex justify-center pt-2">
          <div className="w-1 h-3 rounded-full bg-primary-foreground/50" />
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
