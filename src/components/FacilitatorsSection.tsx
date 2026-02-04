import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const facilitators = [
  {
    name: "Shannon",
    role: "Founder & Visionary",
    bio: "Shannon is the heart and vision behind Earth Song. With years of experience producing transformational gatherings, she weaves ceremony, community, and nature into experiences that stay with you long after you leave.",
    image: "",
    initials: "SH",
  },
  {
    name: "Kelly",
    role: "Co-Producer & Guide",
    bio: "Kelly brings deep experience in women's ceremony and retreat facilitation. Her warmth and grounded presence create a container where everyone feels welcome and held.",
    image: "",
    initials: "KL",
  },
  {
    name: "To Be Announced",
    role: "Workshop Facilitator",
    bio: "Our workshop facilitators bring diverse practices in movement, breathwork, and somatic healing. More guides will be announced as we approach the gathering.",
    image: "",
    initials: "TBA",
  },
  {
    name: "To Be Announced",
    role: "Musical Performer",
    bio: "Soulful musicians will create the soundscape for our day—from gentle morning melodies to firelit evening songs. Stay tuned for performer announcements.",
    image: "",
    initials: "TBA",
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

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {facilitators.map((facilitator, index) => (
            <div
              key={index}
              className="bg-card rounded-2xl p-6 text-center shadow-sm border border-border hover:shadow-md transition-shadow"
              data-testid={`card-facilitator-${index}`}
            >
              <Avatar className="w-24 h-24 mx-auto mb-4 border-4 border-gold/30">
                <AvatarImage src={facilitator.image} alt={facilitator.name} />
                <AvatarFallback className="bg-primary text-primary-foreground font-serif text-xl">
                  {facilitator.initials}
                </AvatarFallback>
              </Avatar>
              <h3 className="font-serif text-xl font-semibold text-foreground mb-1">
                {facilitator.name}
              </h3>
              <p className="text-accent text-sm font-medium mb-3">
                {facilitator.role}
              </p>
              <p className="text-foreground/70 text-sm leading-relaxed">
                {facilitator.bio}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FacilitatorsSection;
