export interface ScheduleEvent {
  title: string;
  location?: string;
}

export interface ScheduleSlot {
  time: string;
  events: ScheduleEvent[];
}

export interface ScheduleGroup {
  heading?: string;
  slots: ScheduleSlot[];
}

export interface ScheduleNote {
  heading: string;
  items: string[];
}

export interface ScheduleDay {
  id: string;
  label: string;
  date: string;
  groups: ScheduleGroup[];
  notes?: ScheduleNote[];
}

export const schedule: ScheduleDay[] = [
  {
    id: "friday",
    label: "Friday",
    date: "Aug 7",
    groups: [
      {
        slots: [
          {
            time: "3:00 PM",
            events: [
              { title: "Studio Shim Collective Collaborative Art" },
              { title: "Synth Bath Jams with Tatoe" },
            ],
          },
          {
            time: "4:30 PM",
            events: [{ title: "Will Ross Musical Performance" }],
          },
          {
            time: "5:00 PM",
            events: [{ title: "Fire Dance Workshop — Angel, Vita, Kalen, Rob" }],
          },
          {
            time: "6:00 PM",
            events: [
              { title: "Opening Ceremony — Kelly Edwards & Shannon Leroux" },
              { title: "Earth Mandala | Land Honouring" },
            ],
          },
          {
            time: "7:00 PM",
            events: [{ title: "Fires are lit" }],
          },
          {
            time: "7:30–10 PM",
            events: [
              { title: "DJ Wizdom & Monica Guerreiro" },
              { title: "Ecstatica Bliss", location: "Beach" },
            ],
          },
          {
            time: "10:00 PM",
            events: [{ title: "Fire Dancers", location: "Beach" }],
          },
          {
            time: "10:00 PM",
            events: [{ title: "Fire Jams + Drum Circle", location: "Beach" }],
          },
        ],
      },
    ],
    notes: [
      {
        heading: "Bonus",
        items: ["Sauna Social (pre pay or bring cash) — set up on the private beach"],
      },
      {
        heading: "Earth Crafts Tent",
        items: ["Herbal Tea Infusions", "Salt Bowl Intentions", "Community Looming Project"],
      },
    ],
  },
  {
    id: "saturday",
    label: "Saturday",
    date: "Aug 8",
    groups: [
      {
        slots: [
          {
            time: "7:00 AM",
            events: [{ title: "Coffee On with Chef Doris (bring your favourite mug)" }],
          },
          {
            time: "7–11 AM",
            events: [{ title: "Sauna Socials (pre pay or bring cash)" }],
          },
          {
            time: "7:45–8:45",
            events: [{ title: "Qi Gong — Jen Pinter" }],
          },
        ],
      },
      {
        heading: "Morning Sessions",
        slots: [
          {
            time: "9–10 AM",
            events: [
              { title: "Somatic Primal Flow — Sam, Chelsi, Collin", location: "Outdoor" },
              { title: "Soul's Purpose Workshop w/ Ferdinand Mels", location: "Barn" },
            ],
          },
          {
            time: "10–3 PM",
            events: [{ title: "Earth Crafts — Community Looming | Kaolin Body Paint" }],
          },
          {
            time: "10:30–11:30",
            events: [{ title: "Harmonic Breathwork — Kelly Edwards", location: "Barn" }],
          },
          {
            time: "12–1:30",
            events: [
              { title: "Mens Circle w/ Darren Austin Hall", location: "Tent" },
              { title: "Womens Circle w/ Monica Guerreiro", location: "Beach" },
              { title: "Kids Circle w/ Kelly Edwards", location: "Barn" },
            ],
          },
          {
            time: "2–3 PM",
            events: [
              { title: "Group Yoga w/ Tania Seagrove", location: "Outdoor" },
              { title: "Holistic Voice Medicine with Madison Ryley", location: "Barn" },
            ],
          },
          {
            time: "3:30–4:30",
            events: [
              {
                title: "Earth Song Floating Sound Bath (bring floaty)",
                location: "Private Beach · Crystal Bowls + Vocals",
              },
            ],
          },
        ],
      },
      {
        heading: "Evening",
        slots: [
          {
            time: "5:30–6:30",
            events: [{ title: "Dan Dwoz of Honeyrunners Musical Performance" }],
          },
          {
            time: "6:30–7:30",
            events: [{ title: "Ashley Gilmore Musical Performance" }],
          },
          {
            time: "7:00–11 PM",
            events: [{ title: "Sauna Socials (pre pay or bring cash)" }],
          },
          {
            time: "7:30 PM",
            events: [
              { title: "Circus Movement w/ Kalen Davison + Fire Workshop with Angel, Vita, & Rob" },
            ],
          },
          {
            time: "8:00 PM",
            events: [{ title: "“Temple of the Wild” Ecstatic Dance w/ Darren Austin Hall" }],
          },
          {
            time: "10:00 PM",
            events: [{ title: "Fire Show & Drum Circle" }],
          },
          {
            time: "11:00 PM",
            events: [{ title: "Fire Jams — Thom Edwards (Ends Midnight)" }],
          },
        ],
      },
    ],
  },
  {
    id: "sunday",
    label: "Sunday",
    date: "Aug 9",
    groups: [
      {
        slots: [
          {
            time: "7:00 AM",
            events: [{ title: "Coffee On with Chef Doris" }],
          },
          {
            time: "7–11 AM",
            events: [{ title: "Sauna Socials (pre pay or bring cash)" }],
          },
          {
            time: "8–9 AM",
            events: [{ title: "Yoga w/ Tania Seagrove" }],
          },
          {
            time: "9–9:45 AM",
            events: [{ title: "Sound Bath w/ Rachel McGarry" }],
          },
        ],
      },
      {
        heading: "Morning",
        slots: [
          {
            time: "10–10:45",
            events: [{ title: "True Sky Sidereal Astrology Workshop — Lumi" }],
          },
          {
            time: "10 AM–12 PM",
            events: [
              { title: "Earth Crafts Stations — Love Wands | Herbal Bath | Herbal Oil Infusion" },
            ],
          },
          {
            time: "11–11:45",
            events: [{ title: "‘Safe with Myself’ Author Jessica Cook Journalling Workshop" }],
          },
          {
            time: "12:00 PM",
            events: [{ title: "Lunch" }],
          },
        ],
      },
      {
        heading: "Afternoon Celebrations",
        slots: [
          {
            time: "12:30 PM",
            events: [{ title: "Drum Circle with Thom Edwards" }],
          },
          {
            time: "1:00 PM",
            events: [{ title: "Belly Dance Fusion Workshop and Performance — Katie Hall" }],
          },
          {
            time: "2:00 PM",
            events: [{ title: "Song Circle w/ Kate Sutherland" }],
          },
          {
            time: "3:00 PM",
            events: [{ title: "Closing Ceremony" }],
          },
        ],
      },
    ],
  },
];
