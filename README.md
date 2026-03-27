# College Quest

A college search and exploration platform built for students and families navigating the college selection process. Browse, filter, compare, and organize over 3,700 U.S. colleges and universities.

**Live site:** [college.pennquinn.com](https://college.pennquinn.com)

## Features

### Search & Discovery
- **Full-text search** across college names, programs, and locations with autocomplete suggestions
- **Multi-filter system** — filter by state, region, size, acceptance rate, and academic program category
- **Four view modes** — table, grid, list, and interactive map
- **Sortable results** by name, tuition, enrollment, acceptance rate, or location

### Interactive Map
- Leaflet-powered map with clustered markers for all 3,700+ colleges
- Three tile layers: Street, Satellite, and Terrain
- **Viewport-aware actions** — see how many colleges are visible on screen, then favorite all, compare, or export them
- **Persistent viewport** — zoom into a region on the map, then switch to table/grid/list view to see only those colleges

### College Details
- Detailed profile pages with admissions data, tuition costs, test scores, and graduation rates
- Location map with links to Apple Maps, Google Maps, and Google Earth
- College notes (personal annotations)
- Resource links (academic calendars, financial aid portals, etc.)
- Similar colleges recommendations
- Previous/next navigation through search results

### Organization
- **Favorites** — save colleges with one click
- **Folders** — organize favorites into named collections
- **Compare** — side-by-side comparison of any selection of colleges
- **Copy for AI** — export college data formatted for ChatGPT, Gemini, or Claude
- **Saved filters** — save and reload filter combinations

### Campus Tours
- Plan multi-day campus visit tours
- Map-based route visualization
- Add stops with notes and scheduling

### Family Features
- **Family accounts** — link parent and student accounts
- **Suggestions** — parents can suggest colleges to students
- **Shared visibility** — parents can view their student's favorites and folders
- **Activity feed** — see recent family activity

### Administration
- Admin dashboard for managing colleges, schools/programs, and users
- Batch operations (add, edit, delete)
- Role-based access control

## Tech Stack

- **Framework:** Next.js 16 (App Router) with React 19 and TypeScript
- **Database:** Supabase (PostgreSQL) with Row Level Security
- **Auth:** Supabase SSR auth with cookie-based sessions
- **Styling:** Tailwind CSS 4
- **Icons:** Font Awesome Pro 7 (duotone style)
- **Maps:** Leaflet / react-leaflet with MarkerClusterGroup
- **State:** React Query (TanStack Query) for server state, URL params for filter state
- **Deployment:** AWS Lightsail behind Cloudflare

## Getting Started

### Prerequisites
- Node.js 18+
- A Supabase project with the required tables (see `scripts/` for migration SQL)

### Environment Variables

Create a `.env.local` file:

```
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### Development

```bash
npm install
npm run dev
```

The app runs at [http://localhost:3000](http://localhost:3000).

### Build

```bash
npm run build
npm start
```

## Project Structure

```
src/
  app/              # Next.js App Router pages and API routes
    admin/          # Admin dashboard
    api/            # REST API endpoints
    college/[id]/   # College detail pages
    compare/        # Side-by-side comparison
    dashboard/      # User dashboard
    tours/          # Campus tour planner
    settings/       # User and family settings
  components/       # React components
    ui/             # Base UI components (Button, Card, Badge, etc.)
  hooks/            # Custom React hooks
  lib/              # Utilities, types, Supabase clients
scripts/            # Database migration SQL files
```
