import gatheringImg from "@/assets/gathering-bg.jpg";

const GatheringSection = () => {
  return (
    <section id="gathering" className="py-20 md:py-28 bg-background">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          <div className="order-2 lg:order-1">
            <p className="text-small-caps text-accent tracking-[0.2em] text-sm mb-4">
              THE GATHERING
            </p>
            <h2 className="font-serif text-3xl md:text-4xl lg:text-5xl font-semibold mb-6 text-foreground">
              A Day to Remember Who You Are
            </h2>
            <div className="space-y-4 text-foreground/80 leading-relaxed">
              <p>
                Earth Song is a one-day festival retreat for those who feel the call to gather in nature, move with intention, and reconnect with the rhythms of the land.
              </p>
              <p>
                Hosted at the breathtaking Still Life Retreat & Lake, in collaboration with Happy Rock Holistics, this gathering weaves together live music, embodied workshops, fire ceremony, nourishing food, and the simple magic of being together under open sky.
              </p>
              <p className="font-serif text-lg italic text-accent">
                This is not a party. It is a homecoming.
              </p>
              <p>
                We come together to slow down, to listen, to celebrate the earth and each other. Whether you arrive alone or with loved ones, you will leave feeling held by something greater—a community of kindred spirits who believe that gathering in sacred space has the power to heal.
              </p>
              <p>
                Earth Song is intentionally intimate. We've capped attendance to preserve the depth and quality of connection. If your heart says yes, trust it.
              </p>
            </div>
          </div>
          <div className="order-1 lg:order-2">
            <div className="relative rounded-2xl overflow-hidden shadow-2xl">
              <img
                src={gatheringImg}
                alt="Golden hour scene at Still Life Retreat"
                className="w-full h-[400px] md:h-[500px] object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default GatheringSection;
