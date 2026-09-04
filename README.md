# FFCS — Club Leaderboard (Frontend)

Static Next.js frontend for the FFCS Club points leaderboard. Built with `@amazecontinuityprojects/amazeui` and Tailwind v4, following the AmazeCC-Club-Hub patterns.

## Features

- **Public leaderboard** with podium, search, category filter, pagination — shows where & how points were earned
- **Member login** (JWT) → **Dashboard**: total, rank, per-category breakdown, full timeline history (reason / where / how / awardedBy)
- **Secure auth**: bcrypt-hashed passwords, JWT access (15m) + hashed refresh (7d rotation), auto-refresh queue, localStorage for static deploy
- **Admin award page** (ADMIN/SUPER_ADMIN): award points with audited metadata

## Stack

- Next.js 16 with `output: 'export'` (fully static – no server needed)
- AmazeUI 1.6.1, `react-native-web` alias, `next-themes`
- Static deploy free: GitHub Pages / Cloudflare Pages / Netlify

## Dev

```bash
pnpm install
cp .env.example .env   # set NEXT_PUBLIC_API_URL (default http://localhost:4000)
pnpm dev               # http://localhost:3004
pnpm build             # creates static `out/` → deploy anywhere
pnpm typecheck
```

### Env

```
NEXT_PUBLIC_API_URL=http://localhost:4000   # → your FFCS-backend URL
```

For GitHub Pages, set `NEXT_PUBLIC_API_URL` as a repository Secret/Var `NEXT_PUBLIC_API_URL` – workflow injects it at build.

## Routing

| Route | Access |
|-------|--------|
| `/` | Public – hero + live board |
| `/leaderboard` | Public – full board + filters |
| `/login`, `/register` | Public |
| `/dashboard` | Auth – my points, breakdown, history |
| `/admin` | ADMIN+ – award points |

All data fetching is client-side (no SSR) so export remains static. API base = `NEXT_PUBLIC_API_URL`.

## AmazeUI usage

Centralized re-export at `src/lib/ui.ts` – import via `import { View, Text, Button, ... } from "@/lib/ui"` (mirrors Club-Hub convention). Global styles from `@amazecontinuityprojects/amazeui/tailwind.css`.

## Backend

See `../FFCS-backend` – Express + Prisma + Postgres (Neon free). Run both locally to develop.
