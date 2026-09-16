# Cursor Prompt: Task & Salary Tracker (Next.js + Supabase + Vercel)

Paste this prompt directly into Cursor (Composer/Agent mode) to generate the project.

---

## Context

Build a web app with Next.js (App Router, TypeScript), hosted on Vercel, using Supabase as the database. There is no account/registration system — instead, there's a single shared access password for the whole app, stored in `.env.local`, and users simply pick who they are from a fixed list of names when needed (e.g. when assigning a task).

Fixed list of people for the task board: **Pavel, Angel, Tonislav, Hristo, Hakan**.
Fixed list of people for the salary page: **Angel, Tonislav, Hristo, Hakan** (no Pavel).

---

## 1. Environment variables

Create a `.env.local` file with exactly these variables:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
ADMIN_PASSWORD=
```
# Fill these from your Supabase project (Settings → API). Do not commit real values.
# See also: .env.local.example and supabase/migrations/001_initial_schema.sql

Notes for implementation:
- `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` (or `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, depending on which Supabase client version/setup is used) are used in the **browser/client** Supabase client.
- `SUPABASE_SERVICE_ROLE_KEY` must **only** be used server-side (Route Handlers / Server Actions), never exposed to the client — it bypasses Row Level Security.
- `ADMIN_PASSWORD` is the single shared password that gates access to the entire app.
- Add `.env.local` to `.gitignore` (should already be ignored by default in Next.js projects) so it's never committed.
- Also generate a `.env.local.example` file with the same variable names but empty/placeholder values, for reference — without the real secrets.
- Remember to add these same variables in the Vercel project's Environment Variables settings when deploying (the local `.env.local` file is not used in production).

## 2. Authentication (shared password gate)

- Single shared password/code, read from `process.env.ADMIN_PASSWORD`.
- When the app is opened, show a simple "Enter password" screen/modal before showing any content.
- After a valid entry, persist the session (httpOnly cookie or similar) so the user isn't asked again on every visit.
- No individual logins — only this one shared password.

## 3. Database (Supabase / Postgres)

Create the following tables in Supabase:

### `tasks`
- `id` (uuid, primary key)
- `code` (text, unique, auto-generated sequential identifier in the format **TDR-1, TDR-2, TDR-3...** — implement via a Postgres sequence or a generated column)
- `title` (text)
- `description` (text, nullable)
- `estimate` (integer, 1–10)
- `assignee` (text, one of: Pavel, Angel, Tonislav, Hristo, Hakan; nullable — can be unassigned)
- `status` (text: `idea`, `todo`, `in_progress`, `done`, `abandoned`)
- `position` (integer — for ordering within a column, for drag & drop)
- `created_at`, `updated_at` (timestamps)

### `salary_records`
- `id` (uuid)
- `person` (text: Angel, Tonislav, Hristo, Hakan)
- `year` (integer)
- `month` (integer, 1–12)
- `paid` (boolean, default false)
- `days_paid` (integer, nullable — if payment is partial, number of days paid)
- `updated_at` (timestamp)
- unique constraint on (`person`, `year`, `month`)

### `activity_log`
- `id` (uuid)
- `entity_type` (text: `task` or `salary`)
- `entity_id` (text — task code, or `person-year-month` for salary)
- `actor` (text — the name selected from the dropdown when performing the action, if available)
- `ip_address` (text — the client's IP address, taken from request headers, e.g. `x-forwarded-for`)
- `action` (text — short description of what happened, e.g. "Moved TDR-4 from TODO to Done", "Marked Hristo as paid for March")
- `created_at` (timestamp)

Use the Supabase JS client. Build a simple API layer (Next.js Route Handlers under `app/api/...`) for CRUD operations instead of querying directly from the client — this makes it easy to log the caller's IP server-side on every change, and lets `SUPABASE_SERVICE_ROLE_KEY` stay server-only.

## 4. Tasks page (Kanban board)

Design and behavior like **Trello/Figma** — cards, drag & drop between columns.

Columns (in this order): **Idea → TODO → In Progress → Done → Abandoned**

- Each card shows: `code` (TDR-X), title, estimate (a number from 1–10, shown as a badge), and the assignee's initials/name.
- Drag & drop cards between columns — on drop, update `status` and `position`, and write a record to `activity_log`.
- Drag & drop to reorder within a column too (update `position`).
- Clicking a card opens a detail view/modal with:
  - Title (editable)
  - Description (editable, textarea)
  - Estimate — select or slider, 1–10
  - Assignee — dropdown with the five names (+ a "None" option)
  - **Delete** button (with confirmation) — deletes the task
- "+ New task" button — opens a form with title, description, estimate, assignee, default status `Idea`. Automatically generates the next TDR code.
- Every change (create, move, edit, delete) writes a row to `activity_log`.

## 5. Salaries page

Separate page/route (e.g. `/salaries`).

Layout:
- Left: a vertical list of names, one per row: **Angel** / **Tonislav** / **Hristo** / **Hakan**.
- To the right of each name: 12 gray squares in a row (representing the months January–December), styled visually like a loading/progress bar.
- Each square corresponds to a specific month of the current (or selectable) year — hovering shows the month name.
- Clicking a square opens a small popover/modal with:
  - A "Paid" toggle checkbox — when checked, the square becomes filled/green.
  - A field to enter the number of days paid (if the payment is partial) — the square can be partially colored or show a number.
- Changes are saved to `salary_records`, and every change generates a row in `activity_log`.
- (Optional, but recommended) — a year selector at the top, in case we want history for past years, not just the current one.

## 6. Activity log / history (bottom of each page or a dedicated section)

- A table/list at the bottom of the page (or a collapsible panel) showing the most recent entries from `activity_log`:
  - Date and time
  - Who (if the actor was selected via a dropdown for that action)
  - IP address
  - What was done
- Sorted most recent first, with pagination or a "Load more" button.

## 7. General technical requirements

- Next.js 14+ (App Router), TypeScript.
- Supabase for the database (use `@supabase/supabase-js`, keys read from `.env.local`, see section 1).
- `@dnd-kit/core` for drag & drop (modern, well-maintained library).
- Tailwind CSS for styling — clean, modern UI resembling Trello/Linear visually (cards with soft shadows, rounded corners, subtle hover effects).
- Hosted on Vercel — make sure the env variables (`ADMIN_PASSWORD`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` / `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SERVICE_ROLE_KEY`) are also set in the Vercel dashboard, not just locally.
- Responsive design — should work on mobile too (especially the Kanban board — horizontal scroll for columns on small screens).

## 8. Navigation

A simple top navbar with two links: **Tasks** and **Salaries**, plus an indicator of who the "currently selected" person is (if we decide to persist the selection in localStorage for convenience — not required for authentication, just UX).

---

Please structure the project cleanly (`app/`, `components/`, `lib/`, `types/` folders), write TypeScript types for `Task`, `SalaryRecord`, and `ActivityLog`, and add a short README with setup instructions — Supabase table SQL migrations, and how to configure the env variables both locally and on Vercel.
