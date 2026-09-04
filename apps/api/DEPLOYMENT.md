# FFCS Backend – Deploy (Local → Free Cloud)

## 1) Local (Docker) – default for dev

`docker-compose.yml` runs `postgres:16-alpine` on `:5432` with `ffcs / ffcs_dev_password / ffcs`.

```bash
pnpm db:local:up     # wait for healthy
pnpm db:push && pnpm db:seed
pnpm dev
```

No Docker? Install Postgres 16 locally, create db/user `ffcs`, set `DATABASE_URL` accordingly.

## 2) Database (Neon free – 512 MB, serverless) for prod

1. https://neon.tech → New Project → copy **Pooled connection string** (ends `?sslmode=require&pgbouncer=true`)
2. Set `DATABASE_URL` to that string.

Alternative: Supabase → Settings → Database → Connection string (pooled).

## 3) Backend on Render (free)

- Connect `FFCS-backend` repo on https://render.com → Web Service
- Build: `pnpm install --frozen-lockfile && pnpm db:generate && pnpm build`
- Start: `pnpm start`
- Health check: `/health`
- Env (Dashboard → Environment):
  - `DATABASE_URL` = Neon pooled URL
  - `JWT_SECRET` = `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"` (>=32 chars)
  - `CORS_ORIGIN` = `https://<you>.github.io,https://ffcs.example.com`
  - `NODE_ENV` = `production`
- Deploy → run once: `pnpm db:push` or `pnpm db:deploy` (via Shell), then `pnpm db:seed` (creates categories + admin). Change `SEED_ADMIN_PASSWORD` immediately.

`render.yaml` is included for Infrastructure-as-Code (`render blueprint init`).

## Alternatives

- **Fly.io** (free tier): `fly launch --no-deploy && fly deploy`
- **Railway** (free): same env, `railway up`
- **Vercel** (Node): add `vercel.json` included, set `DATABASE_URL` + `JWT_SECRET` env, `vercel deploy`.

## 4) Verify

```bash
curl https://your-backend.onrender.com/health
curl https://your-backend.onrender.com/api/leaderboard | jq
```
