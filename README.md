# DarBelDar

> A bilingual (French / English) real estate **sale and exchange** platform for the Algerian market.

DarBelDar lets people across Algeria's wilayas list their homes and either **sell** them or
**swap** them with other owners — ideal for residents and the diaspora looking to travel by
exchanging homes instead of paying for accommodation. Owners publish a listing, browse other
verified homes on a list or map, agree on dates, and arrange the exchange or sale through
built-in messaging. Listings are moderated by an admin team before they go live.

## Features

- **Property listings** — A guided multi-step publishing flow (type, details, location,
  amenities, house rules, availability, desired destinations, photos) supporting properties
  for **exchange**, **sale**, or **both**. Includes 360° equirectangular virtual tours.
- **Exchange flow with date gating** — Send and manage swap requests, set availability
  windows, and confirm an agreed exchange date directly inside the conversation. Past dates
  are disabled when setting availability.
- **Messaging** — Conversations between users, including text and voice messages,
  conversation pinning, and an exchange-details panel for confirming swaps.
- **Map with neighborhood-level privacy** — Browse listings on an interactive Leaflet map
  with clustering. Listings show only an approximate, neighborhood-level location — the exact
  address is never shared, to protect owner privacy.
- **Reviews & favorites** — Leave reviews on listings and save favorite homes.
- **Notifications** — In-app notification bell for activity updates.
- **Dashboard & profiles** — Personal dashboard, editable profile, and public profile pages.
- **Admin panel** — Moderation tools for approving/rejecting pending listings, managing
  users (suspend/reactivate), monitoring exchanges & sales, reviewing reported comments, and
  overseeing conversations.
- **Bilingual FR / EN** — Full French and English translations via i18next, with automatic
  browser-language detection and an in-app language selector.

## Tech stack

- **React 19** + **Vite 8** (JSX, with `@` path alias → `src/`)
- **React Router v7** for client-side routing
- **Tailwind CSS v4** (via the `@tailwindcss/vite` plugin — config lives in `src/index.css`)
- **shadcn/ui** (radix-ui primitives) + **lucide-react** icons
- **Supabase** (`@supabase/supabase-js`) — auth, Postgres database with RLS, and storage
- **i18next** / **react-i18next** for FR/EN internationalization
- **Leaflet** + **react-leaflet** (+ clustering) for maps
- **@photo-sphere-viewer** / **react-photo-sphere-viewer** for 360° tours
- **framer-motion** for animations, **sonner** for toasts, **date-fns** for dates
- Deployed on **Vercel**

## Getting started

### Prerequisites

- **Node.js** — a recent LTS release (Vite 8 requires a modern Node version).
  <!-- TODO: pin the exact Node version. package.json does not declare an `engines` field;
       add one or document the team's supported Node version here. -->
- **npm** (ships with Node.js)
- A **Supabase** project (for the URL and anon key — see [Environment variables](#environment-variables))

### Install

```bash
git clone <repository-url>
cd DarBelDar
npm install
```

### Scripts

The scripts defined in `package.json`:

```bash
npm run dev       # Start the Vite dev server (default: http://localhost:5173)
npm run build     # Production build (outputs to dist/)
npm run lint      # Run ESLint
npm run preview   # Preview the production build locally
```

## Environment variables

The app reads the following variables (referenced via `import.meta.env` in `src/lib/supabase.js`):

| Variable                 | Description                        |
| ------------------------ | ---------------------------------- |
| `VITE_SUPABASE_URL`      | Your Supabase project URL          |
| `VITE_SUPABASE_ANON_KEY` | Your Supabase anonymous/public key |

Create an environment file in the project root and add your values. Vite loads both `.env`
and `.env.local` (and both are git-ignored), so either works for local development:

```bash
# .env (or .env.local)
VITE_SUPABASE_URL=your-supabase-project-url
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
```

> There is no `.env.example` in the repo yet. Consider adding one with the variable names
> above (and **no real values**) so new contributors know what to provide.

Never commit real keys — use only placeholder values in any committed files.

## Deployment

The project deploys to **Vercel**. Routing is handled as a single-page app via `vercel.json`,
which rewrites all paths to `/index.html` so client-side routes (e.g. `/browse`, `/admin`)
resolve correctly.

To deploy:

1. Import the repository into Vercel.
2. Add the environment variables (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`) in the
   Vercel project **Settings → Environment Variables** (these are not committed to the repo).
3. Vercel runs `npm run build` and serves the generated `dist/` output.

## Project structure

```
DarBelDar/
├── public/              # Static assets (favicon, hero image, icons, listing assets)
├── src/
│   ├── pages/           # Route-level pages (Home, Browse, ListingDetail, Messages,
│   │                    #   Exchanges, Dashboard, Profile, Admin*, auth pages, …)
│   ├── components/      # Shared UI (Hero, Footer, MapView, NeighborhoodMap,
│   │   │                #   LocationPicker, Sidebar, NotificationBell, RequireAuth, …)
│   │   ├── filters/     # Browse filter controls (wilaya, type, rooms, dates, …)
│   │   ├── icons/       # Icon components
│   │   └── ui/          # shadcn/ui primitives
│   ├── data/            # Static data (wilaya coordinates)
│   ├── lib/             # supabase.js client + utils.js helpers
│   ├── assets/          # Imported assets
│   ├── i18n.js          # i18next setup + FR/EN translation dictionaries
│   ├── App.jsx          # Routes
│   ├── main.jsx         # App entry point
│   └── index.css        # Global styles + Tailwind v4 theme config
├── index.html           # Vite HTML entry
├── vite.config.js       # Vite config (React + Tailwind plugins, @ alias)
├── vercel.json          # Vercel SPA rewrite config
└── package.json
```

---

Made in Algeria 🇩🇿
