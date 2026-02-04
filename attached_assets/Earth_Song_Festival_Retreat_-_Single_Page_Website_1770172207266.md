# **Earth Song Festival Retreat \- Single Page Website**

## **Complete Design & Development Specification for Lovable.dev**

---

## **Project Overview**

**Website Type:** Single-page scrolling website with anchor navigation  
 **Event:** Earth Song Festival Retreat  
 **Date:** August 8, 2026  
 **Location:** Still Life Retreat & Lake (in collaboration with Happy Rock Holistics)  
 **Primary Goals:** Email capture, ticket sales, volunteer applications, facilitator showcase, FAQ

---

## **Design System**

### **Color Palette**

| Name | Hex Code | Usage |
| ----- | ----- | ----- |
| Deep Burgundy | `#6B2D3D` | Primary buttons, headings, accents |
| Warm Cream | `#FAF7F2` | Backgrounds, light sections |
| Burnt Orange | `#C4713B` | Hover states, secondary accents |
| Charcoal | `#2D2D2D` | Body text |
| Deep Forest | `#1C2B1F` | Dark section backgrounds |
| Soft Gold | `#D4A853` | Decorative accents, icons |

### **Typography**

* **Primary Heading Font:** Cormorant Garamond (or Playfair Display) \- elegant serif  
* **Body Font:** Inter (or Lato) \- clean sans-serif  
* **Accent Text:** Use letter-spacing: 0.2em for labels and small caps

### **Visual Style Guidelines**

* Warm, golden-hour photography tones  
* Fire and earth imagery throughout  
* Soft gradient overlays on images (dark to transparent)  
* Rounded corners on cards and buttons (8px-12px)  
* Subtle box shadows for depth  
* Generous whitespace between sections  
* Mobile-first responsive design

---

## **Navigation**

**Type:** Fixed/sticky header that appears on scroll  
 **Style:** Transparent initially, solid cream background when scrolled  
 **Logo:** "EARTH SONG" text logo (left-aligned)

**Navigation Links (anchor links):**

* The Gathering  
* What to Expect  
* Tickets  
* Facilitators  
* Volunteer  
* FAQ

**Mobile:** Hamburger menu with slide-out drawer

---

## **Section 1: Hero**

**Layout:** Full viewport height, background image with dark gradient overlay  
 **Background:** Event poster or atmospheric fire/nature image  
 **Overlay:** Linear gradient from rgba(28, 43, 31, 0.7) to rgba(28, 43, 31, 0.4)

### **Copy:**

**Pre-headline (small, letter-spaced):**

```
A CEREMONIAL GATHERING
```

**Main Title (large serif, two lines):**

```
EARTH SONG
Festival Retreat
```

**Date & Location (medium size):**

```
August 8, 2026 | Still Life Retreat & Lake
```

**Tagline (italic, smaller):**

```
One day of ceremony, connection & coming home to the earth
```

**Primary CTA Button:**

```
Secure Your Spot
```

*(Links to \#tickets section)*

**Secondary text badges (small, subtle, positioned at bottom of hero):**

```
Alcohol-Free  •  Leave No Trace  •  Limited Capacity
```

---

## **Section 2: Email Capture**

**Background:** Warm cream (`#FAF7F2`)  
 **Layout:** Centered content, max-width 600px

### **Copy:**

**Heading:**

```
Join the Circle
```

**Subtext:**

```
Be among the first to receive updates, early bird offerings, and details as the gathering unfolds. No spam—just meaningful connection.
```

**Form Fields:**

* First Name (placeholder: "Your first name")  
* Email Address (placeholder: "Your email address")

**Submit Button:**

```
Join the Gathering
```

**Privacy Note (small text below button):**

```
We honour your inbox. Unsubscribe anytime.
```

**Functionality:**

* Form submits to email service (Mailchimp, ConvertKit, or Formspree)  
* Success message: "Welcome to the circle. Check your inbox for a confirmation."  
* Error handling for invalid emails

---

## **Section 3: The Gathering (About)**

**Anchor ID:** `#gathering`  
 **Background:** White or very light cream  
 **Layout:** Two-column on desktop (text left, image right), stacked on mobile

### **Copy:**

**Section Label (small, letter-spaced):**

```
THE GATHERING
```

**Heading:**

```
A Day to Remember Who You Are
```

**Body Copy:**

```
Earth Song is a one-day festival retreat for those who feel the call to gather in nature, move with intention, and reconnect with the rhythms of the land.

Hosted at the breathtaking Still Life Retreat & Lake, in collaboration with Happy Rock Holistics, this gathering weaves together live music, embodied workshops, fire ceremony, nourishing food, and the simple magic of being together under open sky.

This is not a party. It is a homecoming.

We come together to slow down, to listen, to celebrate the earth and each other. Whether you arrive alone or with loved ones, you will leave feeling held by something greater—a community of kindred spirits who believe that gathering in sacred space has the power to heal.

Earth Song is intentionally intimate. We've capped attendance to preserve the depth and quality of connection. If your heart says yes, trust it.
```

**Image:** Atmospheric nature shot from Still Life Retreat (golden hour, fire circle, or landscape)

---

## **Section 4: What to Expect**

**Anchor ID:** `#expect`  
 **Background:** Deep Forest (`#1C2B1F`) with cream text  
 **Layout:** Centered heading, then 3-column grid of feature cards (2 columns on tablet, 1 on mobile)

### **Copy:**

**Section Label:**

```
WHAT TO EXPECT
```

**Heading:**

```
A Day Curated as a Living Ceremony
```

**Subtext:**

```
Every element is crafted as an invitation to reconnect—with self, with community, with the land.
```

**Feature Cards (icon \+ title \+ description for each):**

1. **Opening & Closing Ceremony**

```
We begin and end together in sacred circle, setting intentions and offering gratitude as one community.
```

2.   
   **Live Music & Performance**

```
Soulful musicians and performers create the soundscape for our day—from gentle morning melodies to firelit evening songs.
```

3.   
   **Embodied Workshops**

```
Move, breathe, and explore through movement practices, somatic sessions, and creative expression offerings.
```

4.   
   **Fire Circle Gathering**

```
As the sun sets, we gather around the fire for storytelling, song, and the ancient magic of flame.
```

5.   
   **Nourishing Food**

```
Wholesome, lovingly prepared meals to fuel your body and ground you throughout the day.
```

6.   
   **Nature Immersion**

```
The land itself is a facilitator. Wander the trails, rest by the lake, and let nature hold you.
```

**Icon Suggestions:** Use simple line icons (flame, musical note, person in movement, campfire, bowl/leaf, tree)

---

## **Section 5: Tickets**

**Anchor ID:** `#tickets`  
 **Background:** Warm cream with subtle texture or pattern  
 **Layout:** Centered heading, pricing cards side by side (stacked on mobile)

### **Copy:**

**Section Label:**

```
TICKETS
```

**Heading:**

```
Secure Your Place in the Circle
```

**Subtext:**

```
Earth Song is intentionally limited to preserve the intimacy and depth of our gathering. When tickets are gone, they're gone.
```

**Pricing Card 1 \- Early Bird:**

```
EARLY BIRD

$XXX
Available until [DATE]

Includes:
• Full day access (arrival to closing ceremony)
• All workshops & ceremonies
• Live music & performances
• Breakfast, lunch & dinner
• Fire circle gathering
• Connection with an incredible community

[CLAIM YOUR SPOT]
```

**Pricing Card 2 \- Regular:**

```
REGULAR ADMISSION

$XXX
Available after [DATE]

Includes:
• Full day access (arrival to closing ceremony)
• All workshops & ceremonies
• Live music & performances
• Breakfast, lunch & dinner
• Fire circle gathering
• Connection with an incredible community

[GET TICKETS]
```

**Capacity Notice (below cards, centered):**

```
⚡ Limited to [XX] guests to preserve the sacred container
```

**Payment Note:**

```
Secure checkout via Stripe. Interac e-Transfer also accepted—contact us for details.
```

**Button Functionality:** Links to external Stripe checkout URL (client will provide)

---

## **Section 6: Facilitators**

**Anchor ID:** `#facilitators`  
 **Background:** White  
 **Layout:** Centered heading, then scrollable/grid of facilitator cards

### **Copy:**

**Section Label:**

```
OUR GUIDES
```

**Heading:**

```
The Hearts Behind Earth Song
```

**Subtext:**

```
Our facilitators are experienced practitioners, artists, and healers who bring warmth, wisdom, and deep care to everything they offer. More guides will be announced as we approach the gathering.
```

**Facilitator Card Template:**

```
[Circular Headshot Image]

[NAME]
[Role/Specialty]

[2-3 sentence bio describing their background, approach, and what they bring to Earth Song]
```

**Placeholder Facilitators (client to replace):**

**Facilitator 1:**

```
Shannon [Last Name]
Founder & Visionary

Shannon is the heart and vision behind Earth Song. With years of experience producing transformational gatherings, she weaves ceremony, community, and nature into experiences that stay with you long after you leave.
```

**Facilitator 2:**

```
Kelly [Last Name]
Co-Producer & Guide

Kelly brings deep experience in women's ceremony and retreat facilitation. Her warmth and grounded presence create a container where everyone feels welcome and held.
```

**Facilitator 3:**

```
[Name TBA]
Workshop Facilitator

Bio coming soon.
```

**Facilitator 4:**

```
[Name TBA]
Musical Performer

Bio coming soon.
```

**Design Note:** Cards should be component-based to easily add more facilitators. Use a 3-column grid on desktop, 2 on tablet, 1 on mobile.

---

## **Section 7: Volunteer Application**

**Anchor ID:** `#volunteer`  
 **Background:** Deep Forest (`#1C2B1F`) with cream text  
 **Layout:** Two columns on desktop—left side copy, right side form (stacked on mobile)

### **Copy:**

**Section Label:**

```
VOLUNTEER
```

**Heading:**

```
Join Our Village Crew
```

**Body Copy (left column):**

```
Earth Song is co-created by a dedicated team of volunteers who help bring the vision to life. If you feel called to serve, support, and be part of the behind-the-scenes magic, we'd love to hear from you.

Volunteers receive complimentary admission in exchange for a commitment of service hours before and during the event. Roles vary from setup and registration to facilitator support and leave-no-trace coordination.

This is more than volunteering—it's an invitation to be part of the inner circle.

Applications close March 1, 2026.
```

**Form Fields (right column):**

| Field | Type | Required |
| ----- | ----- | ----- |
| Full Name | Text input | Yes |
| Email Address | Email input | Yes |
| Phone Number | Tel input | Yes |
| Tell us about yourself | Textarea (placeholder: "Share a bit about who you are, your background, and what draws you to this work...") | Yes |
| Availability | Textarea (placeholder: "Are you available August 7-9, 2026? Any dates you cannot attend?") | Yes |
| Relevant Experience | Textarea (placeholder: "Have you volunteered at festivals, retreats, or similar events before? Tell us about it...") | No |
| Why Earth Song? | Textarea (placeholder: "What calls you to be part of this gathering?") | Yes |

**Submit Button:**

```
Submit Application
```

**Form Note:**

```
We'll review applications on a rolling basis and be in touch within 2 weeks.
```

**Deadline Badge:**

```
⏰ Applications close March 1, 2026
```

**Functionality:**

* Form submits to client email (use Formspree or Netlify Forms)  
* Success message: "Thank you for your application\! We've received it and will be in touch soon."  
* Required field validation  
* Email confirmation to applicant (if possible)

---

## **Section 8: FAQ**

**Anchor ID:** `#faq`  
 **Background:** Warm cream  
 **Layout:** Centered heading, accordion-style expandable questions

### **Copy:**

**Section Label:**

```
QUESTIONS & ANSWERS
```

**Heading:**

```
Everything You Need to Know
```

**FAQ Items (accordion style \- click to expand):**

**Q1: What time does the day begin and end?**

```
Gates open at [TIME] for arrival and settling in. Opening ceremony begins at [TIME]. The day concludes with closing ceremony around [TIME]. We encourage you to arrive early and stay for the full experience.
```

**Q2: What's included in my ticket?**

```
Your ticket includes full access to all workshops, ceremonies, and performances throughout the day. It also includes breakfast, lunch, and dinner prepared with love by our food team. Basically—everything except getting yourself there!
```

**Q3: Is camping available?**

```
Earth Song is a single-day gathering, so camping is not included. However, Still Life Retreat & Lake offers on-site accommodation options, and there are additional lodging options nearby. Details will be sent to ticket holders closer to the event.
```

**Q4: What should I bring?**

```
Bring comfortable clothes you can move in, layers for changing temperatures, a water bottle, a journal if you like, a cushion or blanket for sitting, and an open heart. A full packing list will be provided to all ticket holders.
```

**Q5: Is the event alcohol-free?**

```
Yes. Earth Song is an alcohol-free and substance-free gathering. We believe in experiencing the fullness of ceremony and connection with clarity and presence. This is a core value of our space.
```

**Q6: What does "Leave No Trace" mean?**

```
We are guests on this beautiful land and committed to leaving it better than we found it. This means packing out what you pack in, respecting the environment, and participating in our collective clean-up at the end of the day.
```

**Q7: Is this event accessible?**

```
We're committed to making Earth Song as accessible as possible. The terrain at Still Life Retreat includes grass, trails, and natural ground. If you have specific accessibility needs or questions, please reach out to us directly and we'll do our best to accommodate you.
```

**Q8: Can I bring my children?**

```
Earth Song is designed as an adult gathering. We ask that guests make childcare arrangements and come ready to fully immerse themselves in the experience.
```

**Q9: What's the refund policy?**

```
Tickets are non-refundable but are transferable. If you can no longer attend, you may transfer your ticket to a friend. Please contact us to arrange the transfer.
```

**Q10: How do I get there?**

```
Detailed directions and parking information will be sent to all ticket holders closer to the event. Still Life Retreat & Lake is located [general area/region—client to confirm].
```

**Q11: I have more questions\!**

```
We're happy to help. Reach out to us at [EMAIL ADDRESS] and we'll get back to you as soon as possible.
```

**Accordion Functionality:**

* Click question to expand/collapse answer  
* Only one open at a time (optional)  
* Smooth animation on open/close  
* Plus/minus or chevron icon indicator

---

## **Section 9: Partners**

**Background:** White  
 **Layout:** Centered heading with horizontal logo row

### **Copy:**

**Section Label:**

```
IN COLLABORATION WITH
```

**Partner Logos (horizontal row, centered):**

1. Still Life Retreat & Lake (logo \+ link to their website)  
2. Happy Rock Holistics (logo \+ link to their website)

**Design:** Logos should be grayscale or muted, with color on hover. Equal sizing/spacing.

---

## **Section 10: Footer**

**Background:** Deep Forest (`#1C2B1F`)  
 **Text Color:** Cream

### **Layout & Copy:**

**Left Column \- Brand:**

```
EARTH SONG
Festival Retreat

A ceremonial gathering at
Still Life Retreat & Lake
August 8, 2026
```

**Center Column \- Quick Links:**

```
The Gathering
Tickets
Facilitators
Volunteer
FAQ
```

**Right Column \- Connect:**

```
Stay Connected

[Instagram Icon] @earthsongfestival
[Email Icon] [email address]

[Compact email signup: Email input + "Subscribe" button]
```

**Bottom Bar (full width, smaller text):**

```
© 2025 Earth Song Festival Retreat. All rights reserved.
Site by [Designer Credit if applicable]
```

**Social Link:** Instagram icon links to Earth Song Instagram page

---

## **Global Functionality Requirements**

### **Forms**

| Form | Submission Method | Notification |
| ----- | ----- | ----- |
| Email Capture | Mailchimp, ConvertKit, or Formspree | Adds to mailing list |
| Volunteer Application | Formspree or Netlify Forms | Email to client |

### **External Links**

* Ticket buttons → Stripe checkout URL (client provides)  
* Partner logos → Partner websites  
* Instagram icon → Earth Song Instagram

### **Smooth Scrolling**

* All anchor links should smooth scroll to their section  
* Offset scroll position to account for fixed header height

### **Mobile Responsiveness**

* All sections must be fully responsive  
* Test at 320px, 375px, 768px, 1024px, 1440px breakpoints  
* Touch-friendly tap targets (min 44px)  
* Hamburger menu for mobile navigation

### **Performance**

* Lazy load images below the fold  
* Optimize all images (WebP format preferred)  
* Minimize layout shift

### **SEO**

**Page Title:**

```
Earth Song Festival Retreat | August 8, 2026 | Still Life Retreat & Lake
```

**Meta Description:**

```
Join Earth Song, a one-day ceremonial festival retreat on August 8, 2026. Experience live music, embodied workshops, fire ceremony, and nourishing food at Still Life Retreat & Lake. Limited capacity—secure your spot today.
```

**Open Graph Tags:**

* og:title: Earth Song Festival Retreat  
* og:description: A ceremonial gathering of music, movement, and connection. August 8, 2026\.  
* og:image: \[Event poster or hero image URL\]  
* og:url: \[Website URL\]

---

## **Lovable.dev Build Prompt**

Use this prompt to initiate the build in Lovable:

---

**Create a single-page festival website for "Earth Song Festival Retreat" with the following specifications:**

**Design:** Nature-inspired, ceremonial aesthetic. Color palette: deep burgundy (\#6B2D3D), warm cream (\#FAF7F2), burnt orange (\#C4713B), deep forest (\#1C2B1F), soft gold (\#D4A853). Use Cormorant Garamond for headings and Inter for body text. Mobile-first, elegant, grounded feel with generous whitespace.

**Sections (in order, with anchor navigation):**

1. **Hero** \- Full viewport, background image with dark overlay, event title "EARTH SONG Festival Retreat", date "August 8, 2026", location "Still Life Retreat & Lake", CTA button "Secure Your Spot", subtle badges for "Alcohol-Free • Leave No Trace • Limited Capacity"

2. **Email Capture** \- Cream background, heading "Join the Circle", name \+ email form, submit button "Join the Gathering"

3. **About/The Gathering** \- Two-column layout, poetic description of the event

4. **What to Expect** \- Dark forest background, 6 feature cards with icons: Opening & Closing Ceremony, Live Music & Performance, Embodied Workshops, Fire Circle Gathering, Nourishing Food, Nature Immersion

5. **Tickets** \- Two pricing cards (Early Bird and Regular) with feature lists and CTA buttons linking to external Stripe checkout

6. **Facilitators** \- Grid of facilitator cards with circular headshots, names, roles, and short bios

7. **Volunteer Application** \- Dark background, two-column with description and full application form (name, email, phone, bio, availability, experience, "why Earth Song")

8. **FAQ** \- Accordion-style expandable questions (10+ items covering logistics, policies, accessibility)

9. **Partners** \- Logo row for Still Life Retreat & Lake and Happy Rock Holistics

10. **Footer** \- Dark background, three columns with brand info, quick links, and social/email signup

**Navigation:** Fixed header that appears on scroll, logo left, anchor links right, hamburger menu on mobile.

**Functionality:** Smooth scroll to anchors, form validation, external links for ticket buttons, responsive at all breakpoints.

