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

## Project Structure
```
src/
├── components/     # Reusable UI components
│   └── ui/         # Shadcn/Radix primitives
├── pages/          # Page components
├── hooks/          # Custom React hooks
├── lib/            # Utility functions
├── assets/         # Static assets
└── test/           # Test files
```

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
