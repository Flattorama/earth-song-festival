# Earth Song Festival Retreat

## Overview
A beautiful landing page for the Earth Song Festival Retreat event happening August 8, 2026 at Still Life Retreat & Lake. This is a ceremonial gathering focused on dance, healing, and celebrating sacred rhythms of life.

## Tech Stack
- **Frontend**: React 18 with TypeScript
- **Build Tool**: Vite
- **Styling**: TailwindCSS with custom Earth Song design system
- **UI Components**: Radix UI primitives with Shadcn
- **Routing**: React Router DOM v6
- **State Management**: TanStack React Query
- **Form Handling**: react-hook-form with zod validation

## Project Structure
```
src/
├── components/     # Reusable UI components
│   └── ui/         # Shadcn/Radix primitives
├── pages/          # Page components
├── hooks/          # Custom React hooks
├── lib/            # Utility functions
├── assets/         # Static assets (hero image)
└── test/           # Test files
```

## Page Sections
The landing page includes:
1. **Navigation** - Sticky header with smooth scroll navigation
2. **Hero** - Full-screen hero with ceremonial fire image
3. **Email Capture** - Newsletter signup section
4. **What to Expect** - Feature grid with icons
5. **The Gathering** - Two-column about section
6. **Tickets** - Pricing cards (Early Bird, Regular)
7. **Facilitators** - Grid of 6 facilitator profiles
8. **Volunteer** - Application form with validation
9. **FAQ** - 11 accordion-style questions
10. **Partners** - Sponsor logo row
11. **Footer** - Navigation, social links, legal

## Design System
The design uses an earthy color palette:
- **Deep Burgundy** (#6B2D3D) - Primary
- **Warm Cream** (#FAF7F2) - Background
- **Burnt Orange** (#C4713B) - Accent
- **Deep Forest** (#1C2B1F) - Secondary
- **Soft Gold** (#D4A853) - Highlights

Typography:
- Headers: Cormorant Garamond (serif)
- Body: Inter (sans-serif)

## Recent Changes (February 2026)
- Added Phase 2 sections: The Gathering, Facilitators, Volunteer, FAQ, Partners
- Implemented proper form validation using shadcn Form + useForm + zodResolver
- Added data-testid attributes to all interactive elements for testing
- Updated SEO with Open Graph meta tags
- Fixed Button styling to follow design guidelines (no custom hover classes)

## Running the Project
The development server runs on port 5000:
```bash
npm run dev
```

## Building for Production
```bash
npm run build
```
Output is generated in the `dist/` directory.
