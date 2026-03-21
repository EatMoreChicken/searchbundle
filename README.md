# SearchBundle

A periodic financial check-in platform. Track net worth, plan projections, pay off debt, and get guidance from Cooper AI — without linking your bank accounts.

> **Product context:** See [docs/NORTHSTAR.md](docs/NORTHSTAR.md) for the full vision and feature roadmap.

---

## Project Structure

```
searchbundle/
├── apps/
│   ├── web/          # Next.js frontend (React + TypeScript + Tailwind)
│   └── api/          # Fastify backend (REST API)
├── packages/
│   └── db/           # Drizzle ORM schema + database client (shared)
├── docs/             # Product docs and design references
└── landing/          # Static landing page (plain HTML, no build step)
```

## Tech Stack

| Layer | Tool |
|---|---|
| Frontend | Next.js 16, React 19, TypeScript, Tailwind CSS v4 |
| Backend | Fastify 5, TypeScript |
| Database | PostgreSQL + Drizzle ORM |
| Auth | Auth.js (NextAuth v5) |
| Deployment | Docker, Nginx, Coolify |

## Getting Started

> **First time on this machine?** Follow every step below in order.
> **Coming back after a reboot?** Jump to [Daily Dev Workflow](#daily-dev-workflow).

### Prerequisites

- [Node.js 20+](https://nodejs.org/)
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (for the local database)

---

### First-Time Setup

#### 1. Install dependencies

```bash
npm install
```

#### 2. Set up environment variables

```bash
cp .env.example .env
```

Open `.env` and fill in the two required values:
- `DATABASE_URL` — use `postgresql://user:password@localhost:5432/searchbundle` to match the Docker setup below
- `AUTH_SECRET` — generate a random secret with: `openssl rand -base64 32`

#### 3. Start the local database

Make sure Docker Desktop is open and running, then:

```bash
docker compose up -d
```

This starts a PostgreSQL container with data stored in `./data/postgres/` (gitignored). You only need to run this **once** — the container persists across reboots (see Daily Dev Workflow below for how to restart it).

#### 4. Run database migrations

```bash
npm run db:generate
npm run db:migrate
```

`db:generate` creates SQL migration files from the schema. `db:migrate` applies them to your database. Run both whenever the schema changes.

#### 5. Seed development data (optional)

```bash
npm run db:seed:dev
```

Populates the database with realistic test data: 6 assets (401k, IRA, checking, savings, HSA, home), 3 liabilities (mortgage, car loan, student loans), and 15 months of net worth tracker entries (all of 2025 + Jan–Mar 2026). Safe to re-run at any time — it clears and re-inserts the seeded data without affecting anything else.

Sign in with `dev@searchbundle.io` / `password123`.

#### 6. Start the development servers

```bash
npm run dev
```

This starts both servers concurrently:
- **Web** → http://localhost:3000
- **API** → http://localhost:3001

The Next.js app automatically proxies all `/api/*` requests to the Fastify server.

---

## Daily Dev Workflow

After the first-time setup, this is all you need each session:

#### 1. Start Docker Desktop

Open Docker Desktop from the Start menu and wait for it to finish loading.

#### 2. Start the database container

```bash
docker compose up -d
```

#### 3. Start the dev servers

```bash
npm run dev
```

That's it — http://localhost:3000 is your app.

#### To stop everything when you're done

```bash
# Stop the dev servers: Ctrl+C in the terminal running npm run dev

# Stop the database container (optional — safe to leave running)
docker compose stop
```

---

## Database: Schema Changes

When you modify `packages/db/src/schema.ts`, run:

```bash
npm run db:generate   # creates a new migration file
npm run db:migrate    # applies it to your local database
```

Commit the generated migration files in `packages/db/migrations/` — they are the source of truth for the database structure.

---

## Database: Dev Seed Data

To populate the database with realistic test data (assets, liabilities, and net worth history):

```bash
npm run db:seed:dev
```

This is idempotent — safe to run multiple times. Use it to reset test data to a known state after manual edits. The script lives at `packages/db/src/seed-dev.ts` if you want to customize it.

---

## Deployment Steps

---

## Feature Notes

### Net Worth Tracker — Cell Math Expressions

When editing a cell in the Net Worth Tracker (Dashboard), you can type a simple math expression instead of an absolute value:

| Input | Meaning |
|---|---|
| `+100` | Add 100 to the previous month's value |
| `-50` | Subtract 50 from the previous month's value |
| `*1.05` | Multiply the previous month's value by 1.05 (5% growth) |
| `/2` | Divide the previous month's value by 2 |

The app finds the **nearest cell to the left** in the same row that contains a value, applies the operation, and saves the result. The formula itself is **never stored** — only the calculated number.

The reference cell is highlighted in amber while you type so you can confirm which month's value is being used as the base.

#### Planned enhancements (future phases)

- Allow the user to arrow-key or click a different reference cell after typing an operator.
- Support chained operations (e.g. `+100 +50`).
- Add a percentage shorthand (e.g. `*7%` → multiply by 1.07).
- Cross-row references (e.g. reference a value in a different category).
- Optionally display the original expression as a sub-label inside the saved cell.
- Right now, we just do just-in-time investment, so as you're putting money in and you have a goal, you reach that goal just in time for retirement, for example, at age 67. We want to add other alternative investment approaches where you front-load savings, for example, like with coast fire or coast barista-style investing. You front-load a lot of your savings so that the compounding can do more of the work, and then potentially you can take on a less stressful savings approach going into the future. We want to add in some of these personas into that initial onboarding step. 
- Dark mode. 