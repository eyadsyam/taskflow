# TaskFlow — Full Stack Task Management Platform

Production-ready internal team task management platform. Bridges a **Client Relations Team** (communicates with clients via WhatsApp) and an **Execution Team** (does the actual work) in real time.

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14 (App Router), TypeScript, Tailwind CSS |
| UI | shadcn/ui (customized), Recharts |
| State | TanStack React Query, Zustand (context) |
| Backend/DB | Supabase (PostgreSQL, Auth, Realtime, Storage) |
| Email | Resend (via Supabase Edge Functions) |
| Validation | Zod + react-hook-form |

## Features

- **Role-based access**: Admin, Client Team, Work Team with RLS policies
- **Task lifecycle**: 4 statuses (pending_client -> in_progress -> done_pending_payment -> paid_closed)
- **Locked tasks**: `paid_closed` tasks are DB-trigger-locked; no one can modify
- **Auth**: Email/password login, registration, and Google OAuth
- **Kanban + Table views**: Drag-and-drop status changes with optimistic updates
- **Real-time**: Comments, tasks, and history update live via Supabase Realtime
- **Email notifications**: On new comments and status changes (Resend)
- **Full audit log**: Every task field change tracked in `task_history`
- **Arabic RTL UI**: Fully right-to-left, Arabic labels, Cairo font
- **Dark / Light mode**: Theme toggle persisted via `next-themes`
- **Keyboard shortcuts**: `N` to create task
- **File attachments**: Upload to Supabase Storage (max 5 files, 10MB each)
- **Dashboard**: KPI cards, status donut chart, 30-day timeline chart
- **Mobile responsive**: All pages work on phones

## Prerequisites

- Node.js >= 18
- Supabase project (free tier works)
- Resend account (optional, for email)

## Setup

### 1. Clone & Install

```bash
git clone <repo-url> taskflow
cd taskflow
npm install
```

### 2. Environment Variables

Copy `.env.example` to `.env.local` and fill in your values:

```bash
cp .env.example .env.local
```

| Variable | Where to get it |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase Dashboard > Settings > API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Same page (anon / public key) |
| `SUPABASE_SERVICE_ROLE_KEY` | Same page (service_role key) — keep secret |
| `RESEND_API_KEY` | https://resend.com/api-keys |
| `RESEND_FROM_EMAIL` | Verified sender in Resend |
| `NEXT_PUBLIC_APP_URL` | `http://localhost:3000` for local dev |

### 3. Database Setup

Run the migrations in order on your Supabase project. Go to **SQL Editor** in the dashboard and execute:

```
supabase/migrations/0001_init_schema.sql
supabase/migrations/0002_triggers.sql
supabase/migrations/0003_rls.sql
supabase/migrations/0004_realtime.sql
```

Or if you have the Supabase CLI linked:

```bash
supabase db push
```

### 4. Google OAuth (Optional)

1. Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Create OAuth 2.0 Client ID
3. Add redirect URI: `https://<your-project>.supabase.co/auth/v1/callback`
4. In Supabase Dashboard > Authentication > Providers > Google, enable and paste Client ID + Secret

### 5. Seed Data

First create 3 test users in Supabase Dashboard > Authentication > Users:

| Email | Password | Note |
|---|---|---|
| `admin@taskflow.test` | `123456` | Admin user |
| `client@taskflow.test` | `123456` | Client Relations |
| `work@taskflow.test` | `123456` | Execution Team |

Then run the seed script in the SQL Editor:

```
supabase/seed.sql
```

This creates profiles for all 3 users and 10 sample tasks in various statuses.

### 6. Edge Functions (Email Notifications)

Deploy the Supabase Edge Functions:

```bash
supabase functions deploy on-task-comment
supabase functions deploy on-task-status-change
```

Set their secrets:

```bash
supabase secrets set RESEND_API_KEY=re_xxx RESEND_FROM_EMAIL="TaskFlow <noreply@yourdomain.com>" APP_URL=https://your-app.vercel.app
```

### 7. Run Dev Server

```bash
npm run dev
```

Visit http://localhost:3000 and login with one of the test accounts.

## Project Structure

```
app/
  (auth)/           Login, Register pages
  (dashboard)/      Protected layout with Sidebar + Header
    dashboard/      KPIs, charts, recent tasks
    tasks/          Task list, create, detail, edit
    team/           Team members list
  auth/callback/    OAuth callback handler
  auth/signout/     Sign-out action

components/
  layout/           Sidebar, Header, NotificationBell
  tasks/            TaskTable, TaskKanban, TaskForm, CommentSection, ...
  ui/               shadcn-style primitives (Button, Card, Select, ...)

lib/
  supabase/         Client + Server + Middleware helpers
  database.types.ts Type definitions for all tables
  schemas.ts        Zod validation schemas
  utils.ts          Status colors, labels, formatters

supabase/
  migrations/       SQL migration files (run in order)
  seed.sql          Test data
  functions/        Edge Functions (Deno)
```

## Database Schema

| Table | Description |
|---|---|
| `profiles` | Extends auth.users — name, email, role |
| `tasks` | Core entity — title, client, status, price, tags, attachments |
| `task_comments` | Comments on tasks (team + internal notes) |
| `task_history` | Audit log of every field change |

### Task Statuses

| Status | Arabic | Color |
|---|---|---|
| `pending_client` | مستني رد العميل | Amber |
| `in_progress` | شغالين عليها | Blue |
| `done_pending_payment` | خلصت - مستنيين الفلوس | Orange |
| `paid_closed` | مغلق / مدفوع | Green + Lock |

### Roles

| Role | Permissions |
|---|---|
| `admin` | Full access to everything |
| `client_team` | Create tasks, update all fields on non-locked tasks |
| `work_team` | Update status + assigned_to on non-locked tasks |

## Scripts

```bash
npm run dev          # Start dev server
npm run build        # Production build
npm run start        # Start production server
npm run typecheck    # Run tsc --noEmit
npm run lint         # ESLint
npm run db:types     # Regenerate Supabase types (needs CLI)
```

## Security Notes

- All Supabase queries use the **anon key** (authenticated client); never service_role on the client
- RLS policies enforce permissions at the database level
- `paid_closed` task lock enforced by a PostgreSQL trigger — cannot be bypassed from frontend
- File uploads validated for type + size on client side
- No hardcoded credentials anywhere

## Deployment

Works out-of-the-box with **Vercel**:

1. Push to GitHub
2. Import in Vercel
3. Set environment variables
4. Deploy

Make sure `NEXT_PUBLIC_APP_URL` is set to your production URL.
