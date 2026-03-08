import shannonImg from "@/assets/Shannon.png";
import kellyImg from "@/assets/Kelly.png";
import darrenImg from "@/assets/Darren.png";
import ashleyImg from "@/assets/Ashley.png";

const facilitators = [
  {
    name: "Shannon Leroux",
    role: "Founder & Land Steward",
    bio: "Shannon Leroux is the steward and founder of the beautiful land where Earth Song Festival will be held. With over 20 years devoted to health, wellness, and human connection, Shannon brings a unique path of leadership and life experience to the space.\n\nHer journey began in the Canadian Armed Forces as a Javelin missile system operator, where she developed the discipline and resilience that continue to guide her work today. A world-ranked figure athlete, actress, and entrepreneur, Shannon has spent years inspiring others to live vibrant, empowered lives and has spoken at women's conferences across Canada.\n\nThrough the land she lovingly stewards, Shannon is passionate about creating spaces where people can gather in connection, wellness, and community.",
    image: shannonImg,
  },
  {
    name: "Kelly Edwards",
    role: "Visionary Bridge Weaver",
    bio: "Kelly Edwards is an earth-loving mother, ceremonial bodyworker, and space holder devoted to weaving connection between Earth, Sky, and community. Through sacred touch, breath, sound, and grounded ritual, she creates spaces that invite presence, beauty, liberation, and authentic connection.\n\nAt Earth Song Festival, Kelly will also guide Harmonic Breathwork, weaving ceremonial elements into the experience to support open expression, deep self-connection, and the courage to stand in truth. Her facilitation invites a natural elevation—where breath awakens clarity, alignment, and embodied freedom.",
    image: kellyImg,
  },
  {
    name: "Darren Austin Hill",
    role: "Workshop Facilitator",
    bio: "Darren Austin Hall is a sound healer, musician, and founder of the Source Resonance Academy, known for guiding powerful experiences through sacred sound and movement.\n\nAt Earth Song Festival, Darren will facilitate Earth Knights, a men's circle for authentic masculinity and brotherhood, and lead Temple of the Wild, an ecstatic dance journey blending shaking medicine, tribal-electronic soundscapes, and a closing ambient sound journey for deep alignment.",
    image: darrenImg,
  },
  {
    name: "Ashley Gilmore",
    role: "Musical Performer",
    bio: "Ashley Gilmore is a Toronto-based singer, performer, and vocal facilitator whose radiant energy and raw authenticity light up every space she enters. Through soulful songwriting and the medicine of voice as frequency, she creates powerful moments of connection, joy, and emotional release.",
    image: ashleyImg,
  },
];

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
            Our facilitators are experienced practitioners, artists, and healers who bring warmth, wisdom, and deep care to everything they offer.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
          {facilitators.map((facilitator, index) => (
            <div
              key={index}
              className="bg-card rounded-2xl p-8 shadow-sm border border-border hover:shadow-md transition-shadow flex flex-col items-center text-center"
              data-testid={`card-facilitator-${index}`}
            >
              <div className="w-36 h-36 rounded-full overflow-hidden border-4 border-gold/30 mb-6 flex-shrink-0">
                <img
                  src={facilitator.image}
                  alt={facilitator.name}
                  className="w-full h-full object-cover"
                />
              </div>
              <h3 className="font-serif text-2xl font-semibold text-foreground mb-1">
                {facilitator.name}
              </h3>
              <p className="text-accent text-sm font-medium mb-4">
                {facilitator.role}
              </p>
              <div className="text-foreground/70 text-sm leading-relaxed space-y-3 text-left">
                {facilitator.bio.split("\n\n").map((paragraph, i) => (
                  <p key={i}>{paragraph}</p>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FacilitatorsSection;
