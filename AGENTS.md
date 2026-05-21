# COAI Lead Monitor

## Quick Start

```bash
npm run dev        # dev mode (Vite HMR + Express on port 5000)
npm run build      # production build (client Vite + server esbuild)
npm start          # serve built app from dist/
npm test           # vitest
npm run lint       # eslint
npm run format     # prettier --write
npm run check      # tsc --noEmit
npm run db:push    # drizzle-kit push (recreates tables)
```

## Architecture

```
server/index.ts        → Express 5 entry + HTTP server
server/routes.ts       → REST API + /print-report + auto-scan startup
server/storage.ts      → SQLite via better-sqlite3 + Drizzle ORM
server/browser-scraper.ts  → Playwright Chromium (Craigslist)
server/rss-fetcher.ts  → RSS/Atom feeds (Reddit, WeWorkRemotely, RemoteOK)
server/static.ts       → production static file serving
server/vite.ts         → dev mode Vite middleware
client/src/            → React 18 SPA (shadcn/ui + Tailwind + Vite)
shared/schema.ts       → Drizzle table definitions + Zod schemas
CoaiLeadMonitor/       → WinUI 3 desktop app (C#, abandoned)
```

**Sources currently scraped:**

- RSS (fast, ~30s): Reddit (r/forhire, r/hiring, keyword search), WeWorkRemotely, RemoteOK
- Browser (slow, ~5min): Craigslist (20 cities × 7 categories)
- Dead: Thumbtack (login-walled), Nextdoor (404), Oodle (restructured) — removed

## Key Conventions

- **DB**: SQLite, auto-creates tables on first startup in `storage.ts`. Column names use snake_case in SQLite, camelCase in JS via Drizzle. No migration files — `db:push` recreates tables.
- **Scoring**: Two separate keyword lists (one in `browser-scraper.ts`, one in `rss-fetcher.ts`) for matching. Final score computed in `storage.ts:scoreLead()` based on keyword count + buying-signal heuristics.
- **Scan auto-starts**: 3s after server start, then every 2 hours. Rate-limited to 1 per 3 min via `/api/fetch`.
- **Data retention**: Leads older than 48 hours are purged on every scan.
- **Quoting**: Double quotes preferred. Semicolons required. 120 col width (enforced by Prettier).

## Guardrails

Pre-commit hook runs `npx lint-staged` → Prettier + ESLint on staged files. Install before committing:

```
git add -A
git commit -m "feat: description"
```

## Env

| Variable        | Default     | Notes                                 |
| --------------- | ----------- | ------------------------------------- |
| PORT            | 5000        | Railway sets this                     |
| NODE_ENV        | development | production for Railway                |
| DATABASE_PATH   | data.db     | /data/data.db in Docker               |
| DISABLE_BROWSER | false       | true on Railway (no RAM for Chromium) |

## Railway

Dockerfile uses the Playwright base image (`mcr.microsoft.com/playwright:v1.44.0-jammy`). Chromium is at `/ms-playwright`. Browser scraper is disabled on free tier — RSS-only is enough for hosted use. Mount persistent volume at `/data` for SQLite.

## Windows Notes

- `npx tsx server/index.ts` starts the server. Run `npm install` if modules are missing.
- CRLF/LF warnings in git are harmless (Windows dev, Linux deployment).
- Kill leftover `node.exe` processes via Task Manager if port is in use.
