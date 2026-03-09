import { useEffect } from "react";
import { Clock } from "lucide-react";

declare global {
  interface Window {
    ml?: (...args: unknown[]) => void;
  }
}

const VolunteerSection = () => {
  useEffect(() => {
    if (window.ml) {
      window.ml("account", "2143726");
    }
  }, []);

  return (
    <section id="volunteer" className="py-20 md:py-28 bg-secondary text-secondary-foreground">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16">
          <div>
            <p className="text-small-caps text-gold tracking-[0.2em] text-sm mb-4">
              VOLUNTEER
            </p>
            <h2 className="font-serif text-3xl md:text-4xl lg:text-5xl font-semibold mb-6">
              Join Our Village Crew
            </h2>
            <div className="space-y-4 text-secondary-foreground/80 leading-relaxed mb-8">
              <p>
                Earth Song is co-created by a dedicated team of volunteers who help bring the vision to life. If you feel called to serve, support, and be part of the behind-the-scenes magic, we'd love to hear from you.
              </p>
              <p>
                Volunteers receive complimentary admission in exchange for a commitment of service hours before and during the event. Roles vary from setup and registration to facilitator support and leave-no-trace coordination.
              </p>
              <p className="font-serif text-lg italic text-gold">
                This is more than volunteering—it's an invitation to be part of the inner circle.
              </p>
            </div>

            <div className="inline-flex items-center gap-2 bg-gold/20 text-gold px-4 py-2 rounded-full text-sm font-medium">
              <Clock className="w-4 h-4" />
              Applications close June 30, 2026
            </div>
          </div>

          <div>
            <div className="ml-embedded" data-form="O3MB9c"></div>
            <p className="text-secondary-foreground/60 text-sm text-center mt-4">
              We'll review applications on a rolling basis and be in touch within 2 weeks.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default VolunteerSection;
