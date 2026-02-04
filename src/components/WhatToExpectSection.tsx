import { Flame, Music, Heart, Users, Utensils, TreePine } from "lucide-react";

const features = [
  {
    icon: Flame,
    title: "Opening & Closing Ceremony",
    description: "Sacred rituals to honor our gathering and seal our intentions.",
  },
  {
    icon: Music,
    title: "Live Music & Performance",
    description: "Soul-stirring performances from world-class musicians and artists.",
  },
  {
    icon: Heart,
    title: "Embodied Workshops",
    description: "Movement, breathwork, and healing practices for body and spirit.",
  },
  {
    icon: Users,
    title: "Fire Circle Gathering",
    description: "An evening of storytelling, song, and community around the sacred fire.",
  },
  {
    icon: Utensils,
    title: "Nourishing Food",
    description: "Plant-based meals crafted with love from local, organic ingredients.",
  },
  {
    icon: TreePine,
    title: "Nature Immersion",
    description: "Forest bathing, lake swimming, and quiet communion with the land.",
  },
];

const WhatToExpectSection = () => {
  return (
    <section id="expect" className="py-20 md:py-28 bg-secondary text-secondary-foreground">
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <div className="text-center mb-16">
          <p className="text-small-caps text-gold tracking-[0.2em] text-sm mb-4">
            The Experience
          </p>
          <h2 className="font-serif text-3xl md:text-4xl lg:text-5xl font-semibold mb-6">
            What to Expect
          </h2>
          <p className="text-secondary-foreground/80 text-lg max-w-2xl mx-auto">
            A day of transformation, connection, and celebration. Here's what awaits you.
          </p>
        </div>

        {/* Feature Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
          {features.map((feature, index) => (
            <div
              key={index}
              className="group bg-secondary-foreground/5 rounded-2xl p-6 md:p-8 transition-all duration-300 hover:bg-secondary-foreground/10 hover:scale-[1.02]"
            >
              <div className="w-14 h-14 rounded-full bg-gold/20 flex items-center justify-center mb-5 group-hover:bg-gold/30 transition-colors">
                <feature.icon className="w-7 h-7 text-gold" />
              </div>
              <h3 className="font-serif text-xl md:text-2xl font-semibold mb-3">
                {feature.title}
              </h3>
              <p className="text-secondary-foreground/70 leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default WhatToExpectSection;
