# TDR Management Studio

Shared-password task board and salary tracker for the TDR team. Built with Next.js (App Router), Supabase, and Tailwind CSS.

## Setup

### 1. Environment variables

Copy the example file and fill in values from your Supabase project (**Settings → API**):

```bash
cp .env.local.example .env.local
```

Required variables:

| Variable | Notes |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Anon / public key |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Optional publishable key (same project) |
| `SUPABASE_SERVICE_ROLE_KEY` | **Server only** — never expose to the browser |
| `ADMIN_PASSWORD` | Shared password that unlocks the app |

### 2. Database

In the Supabase SQL Editor, run the full migration:

`supabase/migrations/001_initial_schema.sql`

This creates `tasks`, `salary_records`, `activity_log`, the `TDR-N` code sequence, and enables RLS (no public policies — the Next.js server uses the service role).

### 3. Install & run

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). You will be prompted for `ADMIN_PASSWORD`.

## Deploy on Vercel

Add the same environment variables in the Vercel project settings (Production / Preview). Local `.env.local` is not used in production.

## App overview

- **Auth** — single shared password; httpOnly cookie session; `proxy.ts` blocks unauthenticated pages/API calls
- **Tasks** (`/tasks`) — Kanban: Idea → TODO → In Progress → Done → Abandoned, drag-and-drop via `@dnd-kit`
- **Salaries** (`/salaries`) — per-person month grid with paid toggle / days paid
- **Activity log** — recent mutations with actor + IP on both pages

People lists:

- Tasks: Pavel, Angel, Tonislav, Hristo, Hakan  
- Salaries: Angel, Tonislav, Hristo, Hakan
