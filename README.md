# DailyQuest

Plan your day, build streaks, earn points you can actually spend.
This is the MVP scaffold — a working **Today** screen with task creation, completion, points, and streaks. Backed by an in-memory store so it runs with zero config; Drizzle schema for Postgres is wired up for when you're ready to persist.

## Stack

- Next.js 15 (App Router) + React 19 + TypeScript
- Tailwind CSS 3 + Framer Motion + lucide-react
- Drizzle ORM + Postgres (postgres-js)
- Zod for input validation
- Server Actions for mutations (no separate API layer yet)

## Run it

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open http://localhost:3000.

The app starts with 5 seed tasks. Complete them to watch points/streak/level rise. State lives in-process; restarting `next dev` resets it. That's intentional — the goal of week 1 is to feel the loop, not run a database.

## When you're ready for a real DB

1. Provision Postgres (Neon free tier is fastest).
2. Set `DATABASE_URL` in `.env.local`.
3. Generate and apply migrations:

```bash
npm run db:generate
npm run db:migrate
```

4. Replace the calls in `src/app/actions.ts` with Drizzle queries against `src/db/schema.ts`. The in-memory store and the schema are intentionally shaped the same way to make this swap mechanical.

## Deploy to Railway

1. Sign up at https://railway.com with GitHub.
2. **New Project → Add Postgres** (provisions in seconds).
3. **+ New → GitHub Repo → DailyQuest** in the same project.
4. In the web service's **Variables** tab, add:
   - `DATABASE_URL` = `${{Postgres.DATABASE_URL}}` (Railway resolves the reference)
   - `AUTH_SECRET` = a fresh 64-char hex (`node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`)
   - `NODE_ENV` = `production`
5. **Settings → Networking → Generate Domain**.
6. Push to `main` → Railway runs `npm run db:migrate && npm run build`, then `npm run start`. Migrations are idempotent.

Nixpacks pins Node 20 ([nixpacks.toml](nixpacks.toml)) and `railway.json` sets the healthcheck path. The DB client at [src/db/client.ts](src/db/client.ts) auto-enables TLS in production / for non-localhost hosts, which Railway requires.

## What's next (per the roadmap)

- Week 1 ✅ Today screen, tasks CRUD, points, streak, level
- Week 1 → habits table + nightly streak rollup job
- Week 2 → time-block view (`@dnd-kit/core`), reward catalog, redemption flow
- Week 3 → Web Push reminders, analytics screen, streak freezes + animations
- Week 4 → onboarding, PWA install, error/empty states, soft launch

## File map

```
src/
  app/
    layout.tsx          # root layout + globals
    page.tsx            # Today screen (server component)
    actions.ts          # server actions for task mutations
    globals.css         # tailwind entry + base styles
  components/
    AddTaskForm.tsx     # client form, server-action submit
    TaskItem.tsx        # task row with complete/undo/delete
    ProgressRing.tsx    # SVG ring used in the header
  store/
    memory.ts           # in-memory state, seeded for first run
  db/
    schema.ts           # Drizzle schema (Postgres) — production target
    client.ts           # Drizzle client (no-op when DATABASE_URL unset)
  lib/
    points.ts           # XP formula + level curve
    cn.ts               # className helper
```

## Decisions worth knowing

- **Append-only ledger** in the schema (`reward_ledger`) — balance is derived, not mutable. Eliminates a class of double-spend bugs and gives you a free audit trail when a user emails "where did my points go?"
- **Effort-weighted points**: `priority × clamp(estimatedMinutes, 5, 180)`. P1 = 1.5×, P2 = 1.0×, P3 = 0.7×. Discourages gaming the streak with trivial tasks.
- **Idempotency** is not yet enforced on `completeTaskAction`; add an `Idempotency-Key` header check before the first mobile build.
- **Auth** is deferred. `DEV_USER_ID` is a single-user stub. Plug in Clerk or Auth.js when you have a second user.

## Known gaps in the scaffold

- No DB-backed mode yet (schema is ready; queries aren't wired).
- No habits, no rewards marketplace, no analytics screen.
- No tests. Add Playwright e2e on `signup → create task → complete → see points` before shipping.
