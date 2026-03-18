# Earth Song Festival — Case Study Suggested Edits

Edits based on cross-referencing the case study content against the actual
codebase, tech stack, and website copy at earthsongfestival.com.

---

## 1. Full Case Study (Lumin8 case study page)

### Subtitle / Intro Line

| Current | Issue | Suggested |
|---------|-------|-----------|
| "A beautiful, nature-inspired digital presence for a holistic wellness practitioner — designed to feel as grounding as the services it represents." | Earth Song Festival is a **festival retreat**, not a wellness practitioner. It doesn't offer "services" — it's an event. | "A nature-inspired digital home for a ceremonial festival retreat — designed to feel as grounding as the gathering it represents." |

### Service Tags

| Current | Issue | Suggested |
|---------|-------|-----------|
| Website Design, Brand Identity, SEO, Content Strategy | Missing the significant integrations work (MailerLite, Supabase, Google Sheets, payment/waiver flow). SEO is light (meta tags only, no structured data or sitemap). | Website Design, Brand Identity, Content Strategy, Integrations |

### The Challenge

| Current | Issue | Suggested |
|---------|-------|-----------|
| "Earth Song Festival had a growing community and a powerful brand story, but no digital home to match. Their existing web presence was fragmented — a mix of social media profiles and a basic landing page that didn't communicate the depth and warmth of their offerings. They needed a cohesive website that could serve as a hub for events, connect with their audience, and reflect the grounded, nature-focused essence of their brand." | Largely fine as narrative context. Minor: "hub for events" implies multi-event management; the site is for one specific festival retreat. | "...They needed a cohesive website that could serve as the digital home for their festival retreat, connect with their audience, and reflect the grounded, nature-focused essence of their brand." |

### The Solution

| Current | Issue | Suggested |
|---------|-------|-----------|
| "We designed and built a custom React website that feels like stepping into a forest clearing — warm, inviting, and intentional. The site uses a forest green and gold palette, **DM Serif Display** typography for an organic feel, and subtle nature-inspired animations." | **DM Serif Display is wrong.** The site uses **Cormorant Garamond** (serif headings) and **Inter** (body text). "Nature-inspired animations" is an overstatement — there are fade-in entrance animations, hover effects, and an immersive fire video in the hero, but nothing specifically evoking nature in the animation style. | "We designed and built a custom React website that feels like stepping into a forest clearing — warm, inviting, and intentional. The site uses a forest green and gold palette with warm cream tones, **Cormorant Garamond** typography for an organic, elegant feel, and an immersive hero video with subtle entrance animations." |
| "Every section was crafted to guide visitors naturally from discovery to action, with event integration and clear calls-to-action throughout." | "Event integration" is vague. The actual integration is ticketing tiers + waiver signing + MailerLite email capture + volunteer form. | "Every section was crafted to guide visitors naturally from discovery to action, with tiered ticketing, email capture, and clear calls-to-action throughout." |

### What We Delivered — Feature Cards

| Card | Current | Issue | Suggested |
|------|---------|-------|-----------|
| **Nature-Inspired Design** | "Earth tones, organic shapes, and flowing layouts that reflect the brand's connection to nature and healing." | "Organic shapes" and "flowing layouts" are overstated — the layout uses standard grid/flex patterns. The design warmth comes from color palette, typography, and imagery. | "Earth tones, warm typography, and an immersive hero video that reflect the brand's connection to nature and ceremony." |
| **Event Integration** | "Embedded calendar and registration system for workshops, sound healing sessions, and community gatherings." | **No calendar exists.** The site has a ticketing section with 3 tiers (Early Bird, Regular, Day Pass) that link to a payment flow, plus a digital waiver signing system. | "Tiered ticketing with early-bird pricing, a digital waiver signing system, and integrated email capture for festival updates." |
| **Custom Brand Identity** | "Cohesive visual language with a forest green and gold palette that communicates warmth and authenticity." | Minor: could mention the actual palette is richer (forest green, deep forest, gold, warm cream, emerald, charcoal). | "Cohesive visual language with a forest green, gold, and warm cream palette that communicates warmth and authenticity." |
| **SEO Foundation** | "Optimized meta tags, structured data, and fast page loads to improve organic search visibility." | **No structured data exists** (no JSON-LD, no schema.org markup). No sitemap. The SEO consists of a title tag, meta description, and Open Graph / Twitter Card tags. | "Optimized meta tags, Open Graph integration, and fast page loads to support organic search visibility." |
| **Performance Optimized** | "Lightweight React build hosted on GitHub Pages — blazing fast with zero hosting costs." | Accurate. No change needed. | *(No change)* |
| **Mobile-First Experience** | "Fully responsive design ensuring a seamless experience across devices for an on-the-go audience." | Accurate — Tailwind responsive breakpoints are used throughout. | *(No change)* |

### Testimonial

| Current | Issue | Suggested |
|---------|-------|-----------|
| "Lumin8 delivered a beautiful, professional website that perfectly captures our brand. The process was seamless and fast." — Earth Song Festival, Founder | Unverifiable but reasonable. Note the founder's name is Shannon Leroux (listed on the site as "Founder & Land Steward"). Consider attributing by name for authenticity. | "..." — **Shannon Leroux**, Earth Song Festival Founder |

### Project Timeline

| Phase | Current | Issue | Suggested |
|-------|---------|-------|-----------|
| Phase 2 — Content & Copy | "AI-drafted and human-refined copy that captures the spiritual and grounded essence of the brand. Every word intentional." | Fine if accurate to your process. Consider whether you want to highlight the AI aspect publicly. | *(Your call — no factual inaccuracy)* |
| Phase 3 — Design & Build | "Custom React website with nature-inspired animations, warm typography using **DM Serif Display**, and a palette of forest greens and golds." | **Wrong font name.** | "Custom React website with an immersive hero video, warm typography using **Cormorant Garamond**, and a palette of forest greens, golds, and warm cream." |

---

## 2. Mini-Case Study Card (dark card with tags)

| Element | Current | Issue | Suggested |
|---------|---------|-------|-----------|
| Description | "Nature-inspired website and brand identity for a holistic wellness community." | "Holistic wellness community" is inaccurate. It's a festival retreat. | "Nature-inspired website and brand identity for a ceremonial festival retreat." |
| Tags | Festival, Ticketing, React, Supabase | Accurate. Could add "MailerLite" given the significant integration work. | Festival, Ticketing, React, Supabase *(or add MailerLite)* |

---

## 3. Expanded Case Study Card (yellow / dark expandable)

| Element | Current | Issue | Suggested |
|---------|---------|-------|-----------|
| Category label | "WEBSITE & BRAND IDENTITY" | Fine. | *(No change)* |
| Description | "A nature-inspired digital presence for a holistic wellness practitioner." | **"Holistic wellness practitioner" is wrong.** The client is a festival retreat, not an individual practitioner. | "A nature-inspired digital presence for a ceremonial festival retreat." |
| Challenge | "Earth Song Festival had a growing community but no cohesive digital home — just fragmented social profiles and a basic landing page." | Fine as-is. | *(No change)* |
| Solution | "We designed a custom React website with a forest green and gold palette, **DM Serif Display** typography, and nature-inspired animations." | **Wrong font.** Animations overstated. | "We designed a custom React website with a forest green, gold, and cream palette, **Cormorant Garamond** typography, and an immersive video hero." |
| Results | "3x increase in inquiries, a professional digital presence, and a platform that truly reflects the brand's warmth and authenticity." | "3x increase in inquiries" is unverifiable from the codebase. If this is a real metric, keep it. If estimated, consider softening. | *(Keep if verified; otherwise soften to "significant increase in inquiries")* |

---

## Summary of Critical Fixes (must-change)

1. **"DM Serif Display" → "Cormorant Garamond"** — appears in 3 places (Solution, Timeline Phase 3, Expanded Card)
2. **"holistic wellness practitioner/community" → "ceremonial festival retreat"** — appears in 3 places (Subtitle, Mini-Card, Expanded Card)
3. **"Embedded calendar and registration system" → ticketing + waiver + email capture** — Event Integration card
4. **"structured data" → remove** — SEO card (no structured data exists)

## Nice-to-Have Improvements

5. Add "Integrations" to service tags (MailerLite, Supabase, Google Sheets, waiver system)
6. Attribute testimonial to Shannon Leroux by name
7. Mention the warm cream background color alongside forest green and gold
8. Consider adding "MailerLite" to the tech tags on the mini-card
