# Eyad Syam — Full-Stack Developer

**Specializing in SaaS Platforms, Real-Time Applications, and Team Collaboration Tools**

Email: eyadsyam124@gmail.com
GitHub: github.com/eyadsyam
Portfolio: TaskFlow (live demo available on request)

---

## About My Work

I build production-grade SaaS products end-to-end — from database schema and API design, through real-time infrastructure, to polished user interfaces. My approach prioritizes shipping working software: clean architecture, secure-by-default data access, and UX that feels intentional rather than templated.

Most of my recent work has been on team-collaboration SaaS products with real-time features (chat, presence, live data), role-based access control, and file storage at scale. I handle both the frontend craft (design systems, animations, accessibility) and the backend concerns (RLS policies, migrations, performance).

---

## Recent Work — Case Study: TaskFlow

**A complete team collaboration platform with real-time chat, task management, and file sharing.**

### Live Demo
Repository: https://github.com/eyadsyam/taskflow
Deployment: Vercel (URL shared on request)

### What It Does

TaskFlow is an internal-team SaaS platform that combines three core workflows in one product:

1. **Team Chat** — Slack-style channels + direct messages with real-time delivery, typing indicators, emoji reactions, file uploads (any size), message editing/deletion, and reply threads.
2. **Task Management** — Kanban board and table views with 4-state workflow (pending → in progress → awaiting payment → paid/closed), client contact tracking, pricing, tags, and file attachments.
3. **Team Collaboration** — Live presence indicators (online/away/offline) visible across every surface, per-task discussion rooms, and status messages.

### Scope of Implementation

This was a complete end-to-end build — not using templates or boilerplate:

- **Authentication:** Email/password + Google OAuth, multi-step onboarding wizard with profile personalization, middleware-based route protection, automatic redirects based on onboarding state
- **Real-time Infrastructure:** Postgres triggers + Supabase Realtime broadcasting for messages, reactions, and presence. Typing indicators via broadcast channels. Live profile updates across all connected clients.
- **File Handling:** 5GB per-file limit, unlimited count, direct browser-to-Supabase uploads with progress tracking, inline image/video/audio preview, paste-from-clipboard support
- **Database Design:** 8 tables with proper foreign keys, indexes on hot paths, Row-Level Security (RLS) policies for authorization, triggers for automatic denormalization (e.g., last_message_at), history tables for audit trails
- **UI System:** Custom design system with dark mode default, RTL layout for Arabic, 20+ reusable primitives (buttons, inputs, popovers, dropdowns, dialogs), custom illustrations and SVG assets, smooth animations and micro-interactions
- **Localization:** Full Arabic (Egyptian dialect) interface with proper RTL rendering, bi-directional text handling, locale-aware date/time formatting

### Technical Details That Matter

**Database Schema (Postgres via Supabase):**
```
profiles              (users with presence, preferences)
tasks                 (with lock trigger preventing edits to paid-closed items)
conversations         (channels, DMs, task-linked rooms)
conversation_members  (membership + per-user read state)
messages              (with reply threading)
message_attachments   (separate table for query efficiency)
message_reactions     (with unique constraint on user+emoji+message)
team_settings         (single-row settings table with admin-only write)
```

**Row-Level Security:** Every table has explicit policies. Non-admins cannot update paid_closed tasks (enforced by database trigger, not just UI). Team members can read all data but only modify their own profile/messages. Admin-only operations (team settings, task deletion) gated at the database level.

**Middleware Logic:** Custom Next.js middleware handles four distinct states per request — unauthenticated, authenticated-without-profile, authenticated-needs-onboarding, fully-onboarded — with appropriate redirects for each.

**Performance Considerations:** Indexed `(conversation_id, created_at DESC)` on messages for pagination. Denormalized `last_message_at` on conversations to avoid expensive JOINs when sorting the sidebar. Realtime subscriptions scoped per-conversation to reduce client-side noise.

### Tech Stack Used

| Layer          | Technology                                    | Why                                               |
|----------------|-----------------------------------------------|---------------------------------------------------|
| Framework      | Next.js 14 (App Router)                       | Server components, streaming, built-in routing   |
| Language       | TypeScript (strict mode)                      | Catch errors at compile time, not in production  |
| Database       | Postgres (via Supabase)                       | Relational data + full SQL + RLS                 |
| Auth           | Supabase Auth                                 | OAuth, JWT, session management out of the box    |
| Realtime       | Supabase Realtime (Postgres changes + broadcast) | Replaces need for custom WebSocket server     |
| Storage        | Supabase Storage                              | S3-compatible, direct uploads, CDN-backed        |
| UI Primitives  | Radix UI + custom components                  | Accessible headless components                   |
| Styling        | Tailwind CSS                                  | Rapid iteration, consistent design tokens        |
| Forms          | React Hook Form + Zod                         | Type-safe validation                             |
| State          | React Query + Zustand                         | Server state + client state separation           |
| Deployment     | Vercel                                        | Zero-config for Next.js, edge functions         |

---

## Proposed Approach for Your Project

Based on the description I have so far, here's how I'd approach a similar SaaS project. Details will be refined once I understand your specific domain and users.

### Phase 1 — Discovery & Architecture (Week 1)
- Requirements workshop (sync or async)
- User flow mapping
- Database schema design
- API contract and data model
- Design system direction (colors, typography, components)

**Deliverables:** Technical spec document, ERD (entity relationship diagram), Figma wireframes (or design direction), development environment setup

### Phase 2 — Foundation (Week 2)
- Repository setup with CI/CD
- Supabase project + schema migrations + RLS policies
- Authentication flow (email + social)
- Design system components (first batch)
- Deployment pipeline

**Deliverables:** Working auth, empty app shell deployed to staging

### Phase 3 — Core Features (Weeks 3–5)
- Primary user flows
- Real-time infrastructure (if needed)
- File upload handling (if needed)
- Dashboard and data visualization
- Admin surfaces

**Deliverables:** Working MVP with all primary flows

### Phase 4 — Polish & Testing (Week 6)
- Cross-browser testing
- Mobile responsiveness
- Performance optimization (bundle size, image optimization, database indexes)
- Error handling + edge cases
- End-to-end testing of critical paths

**Deliverables:** Production-ready build

### Phase 5 — Launch (Week 7)
- Production deployment
- Custom domain + SSL
- Analytics setup
- Documentation handoff
- 2 weeks of included bug-fix support

**Deliverables:** Live product + documentation

---

## Estimated Timeline

| Scope                    | Duration     |
|--------------------------|--------------|
| MVP (core features only) | 5–7 weeks    |
| Full v1 (polished)       | 7–10 weeks   |
| Enterprise-grade v1      | 10–14 weeks  |

Timeline variance depends on: design iterations, third-party integration complexity, and scope of custom requirements.

---

## Initial Cost Estimate

These are rough ranges — a firm quote requires a 30-minute call to understand scope. I bill in fixed milestones tied to deliverables, not hourly.

| Scope                                       | Price Range (USD) |
|---------------------------------------------|-------------------|
| MVP (auth + 1 core flow + dashboard)        | $2,500 – $4,000   |
| Standard SaaS (auth + 3–4 flows + admin)    | $4,000 – $7,500   |
| Complex (realtime + integrations + mobile)  | $7,500 – $12,000  |

**What's included in every engagement:**
- Full source code (GitHub repository, you own everything)
- Database schema + migrations
- Deployment to your preferred host (Vercel, AWS, self-hosted)
- Technical documentation
- 2 weeks post-launch bug-fix support
- Video walkthrough of the codebase for your future developers

**Not included (billed separately if needed):**
- Ongoing feature work after the initial 2-week support window
- Design-from-scratch if you don't have a direction (I can recommend a designer or produce functional designs)
- Third-party service fees (Supabase, Vercel, domain, email provider, etc. — typically $0–$50/month for MVP, scales with users)

---

## How I Work

- **Async-first communication** via Slack, Discord, or email. I document decisions so nothing gets lost.
- **Daily progress updates** via screenshare recordings or written summaries.
- **GitHub-based workflow** — you see every commit, can review code, and have full access from day one.
- **Staging environment** available from Week 2 onwards — you can click through working builds before the final ship.
- **Fixed-price milestones** — I absorb the risk of estimates being off, you get cost certainty.

---

## Next Step

If you'd like to move forward, I suggest a 30-minute call to:
1. Understand your product and users in detail
2. Identify the critical path for launch
3. Agree on scope + timeline + milestones
4. Send a written proposal with fixed pricing per milestone

I can share the live TaskFlow demo and walk you through the codebase during that call so you can evaluate the code quality directly.

**Availability:** I can start within 1 week of contract signing.

Looking forward to hearing about your project.

— Eyad
