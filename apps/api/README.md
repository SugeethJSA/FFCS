# FFCS Backend

Secure backend for FFCS Club Leaderboard – Express + Prisma. Local **without Docker** via SQLite, prod/Docker via Postgres (Neon/Supabase free).

## 1) Local WITHOUT Docker (default – zero setup)

`prisma/schema.prisma` now uses `sqlite` + `DATABASE_URL=file:./dev.db` → file at `prisma/dev.db`. No Postgres/Docker needed.

```bash
pnpm install

# create tables + seed (uses file:./dev.db → prisma/dev.db)
pnpm db:push
pnpm db:seed  # categories + SUPER_ADMIN admin/ChangeMe123! + demo members (SEED_DEMO=true)

# run API
pnpm dev      # http://localhost:4000
curl http://localhost:4000/health
```

`.env` already created for you (`DATABASE_URL=file:./dev.db`, `JWT_SECRET` generated). `src/lib/prisma.ts:1` normalizes `file:` URLs to absolute `prisma/dev.db` so both `prisma db push` (schema-relative) and `pnpm dev` (cwd-relative) find the same file.

Helpful:

```bash
pnpm db:studio # GUI
```

To reset file DB: `Remove-Item prisma/dev.db -Force; pnpm db:push; pnpm db:seed`

## 2) Local WITH Docker (Postgres) – optional

If you prefer Postgres locally:

```bash
# switch schema to postgres
Copy-Item prisma/schema.postgres.prisma prisma/schema.prisma -Force
# set .env DATABASE_URL to docker URL
# DATABASE_URL="postgresql://ffcs:ffcs_dev_password@localhost:5432/ffcs?schema=public"
pnpm db:local:up   # docker compose up -d --wait
pnpm db:push && pnpm db:seed
pnpm dev
```

Other docker helpers: `pnpm db:local:down`, `pnpm db:local:reset`.

## 3) Prod (free cloud – Postgres)

For Neon/Supabase, keep `provider = "postgresql"`:

1. Restore postgres schema if you switched to sqlite: `Copy-Item prisma/schema.postgres.prisma prisma/schema.prisma -Force; pnpm db:generate`
2. Set `DATABASE_URL` to Neon pooled `postgresql://user:pass@ep-xxx.neon.tech/db?sslmode=require&pgbouncer=true`
3. On Render/Fly/Railway set env `DATABASE_URL`, `JWT_SECRET`, `CORS_ORIGIN=https://<you>.github.io`, `NODE_ENV=production`
4. `pnpm db:deploy` (or `db:push` for Neon pooled) + `pnpm db:seed`

## API

- `POST /api/auth/register` { email, username, displayName, password }
- `POST /api/auth/login` { login, password } → { accessToken, refreshToken }
- `POST /api/auth/refresh` { refreshToken }
- `GET  /api/auth/me` Bearer → { user, rank, breakdown }
- `GET  /api/leaderboard?limit=50&offset=0&category=wins&search=a` public
- `GET  /api/points/me` + `/me/stats` auth
- `POST /api/admin/award` admin { recipientUsername, amount, reason, where, how, categorySlug }
- `GET  /api/categories`

## Security

`helmet`, CORS allowlist, `express-rate-limit` (auth 10/15m, award 30/h), `bcryptjs` cost 12, JWT 15m + SHA-256 hashed refresh 7d rotation, zod, transactions, role `MEMBER/ADMIN/SUPER_ADMIN`.

See `SECURITY.md` and `DEPLOYMENT.md`.

## Prisma

```bash
pnpm db:generate
pnpm db:push       # dev
pnpm db:migrate    # creates migration (postgres only)
pnpm db:studio
```
