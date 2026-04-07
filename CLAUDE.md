# Meridian — Personal Life OS

A full-stack personal productivity and life-tracking app built with Next.js 16, TypeScript, PostgreSQL (Neon), and NextAuth.

---

## Tech Stack

| Layer | Tech |
|---|---|
| Framework | Next.js 16 (App Router) + TypeScript 5 |
| Styling | Tailwind CSS 4 + Framer Motion |
| Auth | NextAuth v4 (JWT + DB adapter) |
| ORM | Prisma 6 |
| Database | Neon PostgreSQL (prod), SQLite (dev fallback) |
| Storage | Vercel Blob |
| PWA | Serwist 9 (service worker disabled in dev) |
| Icons | Lucide React |
| Drag & Drop | @dnd-kit |
| Interaction | Framer Motion + Canvas Confetti |

---

## Project Structure

```
/app                  → Next.js routes + API handlers
  /api                → REST endpoints (see API Routes below)
  /(pages)            → Home, diary, fitness, planning, media, etc.
/components           → Feature-organized React components
/lib                  → auth.ts, google.ts, prisma.ts (singleton)
/hooks                → Custom React hooks
/types                → TypeScript types (next-auth.d.ts session extension)
/prisma               → schema.prisma + migrations
middleware.ts         → Route protection (redirects to /login)
```

---

## Features & Routes

| Route | Feature |
|---|---|
| `/` | Home dashboard — greeting, weekly recap, activity feed, focus widget, countdowns |
| `/diary` | Daily journal — entries, day ratings, streaks, calendar view |
| `/fitness` | Weight tracker, Smart Workout Log, AI Muscle Map, Progression Analytics, Rest Timer, Plate Calculator |
| `/planning` | Kanban by weekday, Google Calendar two-way sync, PDF export |
| `/mind-dump` | Quick note capture (text, links, ideas) |
| `/media` | Books/movies/TV tracker with status & ratings |
| `/dashboard` | Lock-screen style widget view |
| `/login`, `/signup` | Credential & Google OAuth auth |

---

## Database Models (Prisma)

- `User`, `Account`, `Session`, `VerificationToken` — NextAuth standard
- `DiaryEntry` — one per user per date (unique constraint), has rating enum
- `WeightLog`, `WorkoutLog`, `ProgressPhoto` — fitness tracking (WorkoutLog has `exercises` JSON for set-level details)
- `Task` — weekly tasks with optional `gcalEventId` for Google Calendar sync
- `Countdown` — countdown events
- `NoteBlock` — mind dump notes
- `MediaItem` — books/movies/TV with status & rating

All models cascade delete on User deletion.

---

## Auth & Middleware

- **NextAuth v4** — JWT session strategy + PrismaAdapter
- **Providers:** Google OAuth (with calendar scope) + Credentials
- **Passwords:** bcryptjs, salt 12
- **Middleware** (`middleware.ts`): protects all routes except `/api/auth`, `/api/register`, `/login`, `/signup`

---

## API Routes

```
POST   /api/register              User registration
GET/POST/PUT/DELETE /api/planning  Task CRUD
POST   /api/planning/sync         Push tasks → Google Calendar
GET    /api/planning/gcal         Fetch Google Calendar events
GET/POST /api/diary               Diary entry upsert by date
GET/POST/DELETE /api/fitness/weight
GET/POST /api/fitness/workout
GET/POST/PATCH/DELETE /api/media
GET/POST/DELETE /api/countdowns
GET    /api/dashboard             Dashboard aggregated data
POST   /api/upload                File → Vercel Blob
GET    /api/calendar/today        Today's GCal events
```

---

## Environment Variables

```env
DATABASE_POSTGRES_PRISMA_URL          # Neon pooled connection
DATABASE_POSTGRES_URL_NON_POOLING     # Neon direct connection
NEXTAUTH_SECRET
NEXTAUTH_URL
GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET
```

---

## Dev & Build Commands

```bash
npm run dev       # Dev server on :3000
npm run build     # prisma generate + db push + webpack build (4GB memory)
npm run start     # Production server
```

Build runs `prisma generate` and `prisma db push --accept-data-loss` (non-blocking). Uses explicit webpack (not Turbopack) for Vercel stability.

---

## Key Files

| File | Purpose |
|---|---|
| `lib/auth.ts` | NextAuth config, providers, callbacks |
| `lib/google.ts` | Google OAuth client factory with auto token refresh |
| `lib/prisma.ts` | Singleton Prisma client |
| `middleware.ts` | Route-level auth enforcement |
| `types/next-auth.d.ts` | Session type augmentation |
| `lib/muscle-mapping.ts` | Map exercises to muscle groups for heat-map indexing |
| `FITNESS_ROADMAP.md` | Log of pending ideas and UI refinements |
| `GOOGLE_SETUP.md` | Google OAuth setup guide |
| `TROUBLESHOOTING.md` | Common issues |

---

## Architecture Notes

- **Server + Client Components** — `"use client"` only where interactivity is needed
- **All data via REST API routes** — no direct DB calls from client components
- **Optimistic UI updates** — UI updates before server confirms
- **Google Calendar sync** — two-way; task changes create/update/delete GCal events, `gcalEventId` stored on Task for reconciliation
- **Weekly planning model** — tasks keyed by weekday + week offset
- **Dark mode** via next-themes; glass-morphism + particle background aesthetic
