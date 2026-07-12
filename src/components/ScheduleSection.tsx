import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { schedule } from "@/data/schedule";

const ScheduleSection = () => {
  return (
    <section id="schedule" className="py-20 md:py-28 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <p className="text-small-caps text-accent tracking-[0.2em] text-sm mb-4">
            THE PROGRAM
          </p>
          <h2 className="font-serif text-3xl md:text-4xl lg:text-5xl font-semibold mb-6 text-foreground">
            Three Days of Earth Song
          </h2>
          <p className="text-foreground/70 text-lg max-w-2xl mx-auto">
            A full weekend of ceremony, movement, music, and connection. Explore
            each day below — times and offerings may shift with the rhythm of the
            land.
          </p>
        </div>

        <Tabs defaultValue={schedule[0].id} className="max-w-3xl mx-auto">
          <TabsList className="mx-auto flex h-auto flex-wrap justify-center gap-2 bg-muted p-1.5 mb-12">
            {schedule.map((day) => (
              <TabsTrigger
                key={day.id}
                value={day.id}
                data-testid={`schedule-tab-${day.id}`}
                className="px-4 py-2 text-sm md:text-base font-serif"
              >
                {day.label}
                <span className="hidden sm:inline">&nbsp;· {day.date}</span>
              </TabsTrigger>
            ))}
          </TabsList>

          {schedule.map((day) => (
            <TabsContent key={day.id} value={day.id} className="mt-0">
              {day.groups.map((group, groupIndex) => (
                <div key={groupIndex} className="mb-4">
                  {group.heading && (
                    <p className="text-center font-serif italic text-lg text-accent mt-8 mb-2">
                      ~ {group.heading} ~
                    </p>
                  )}
                  <div>
                    {group.slots.map((slot, slotIndex) => (
                      <div
                        key={slotIndex}
                        data-testid={`schedule-slot-${day.id}-${groupIndex}-${slotIndex}`}
                        className="flex flex-col sm:flex-row gap-1 sm:gap-6 md:gap-8 py-4 border-b border-border/50"
                      >
                        <div className="w-full sm:w-28 md:w-32 shrink-0 text-accent font-medium sm:whitespace-nowrap">
                          {slot.time}
                        </div>
                        <div className="flex-1 space-y-2">
                          {slot.events.map((event, eventIndex) => (
                            <div key={eventIndex}>
                              <span className="font-serif text-lg text-foreground">
                                {event.title}
                              </span>
                              {event.location && (
                                <span className="ml-2 inline-block rounded-full bg-gold/10 px-2 py-0.5 text-xs font-medium text-gold align-middle">
                                  {event.location}
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              {day.notes && day.notes.length > 0 && (
                <div className="mt-8 bg-card rounded-2xl border border-border p-6 space-y-4">
                  {day.notes.map((note, noteIndex) => (
                    <div key={noteIndex}>
                      <p className="text-small-caps text-accent tracking-[0.15em] text-sm font-medium mb-2">
                        {note.heading}
                      </p>
                      <ul className="space-y-1 text-foreground/70">
                        {note.items.map((item, itemIndex) => (
                          <li key={itemIndex} className="text-sm leading-relaxed">
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </section>
  );
};

export default ScheduleSection;
