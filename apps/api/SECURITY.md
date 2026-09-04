# FFCS Backend – Security Overview

## Model

- **Passwords**: `bcryptjs` cost 12, никогда not logged. Policy: 8–128 chars, must include upper/lower/digit (zod `registerSchema`).
- **JWT**: HS256 access token 15 min (`JWT_SECRET` >=32 chars). Refresh is **opaque 96-char hex**, stored as SHA-256 hash (`RefreshToken.tokenHash`). Rotation: old token revoked on refresh, new token issued. Expired/revoked purged hourly.
- **Headers**: `helmet` (nosniff, DENY frame, HSTS 63072000, Permissions-Policy none). CORS allowlist via `CORS_ORIGIN` (comma-separated) – credentials allowed, `Authorization` + `Content-Type` only. Unknown origins 403.
- **Rate limits**: `express-rate-limit` – `general 100/15m`, `auth 10/15m`, `award 30/hour`. 429 with `Retry-After`.
- **Validation**: `zod` on all inputs (register/login/award/category). `express.json({ limit: "100kb" })`.
- **DB**: Prisma parameterized queries – no string SQL. `totalPoints` denormalized inside transaction (`prisma.$transaction`) on award/revoke to keep leaderboard fast without race.
- **Roles**: `MEMBER < ADMIN < SUPER_ADMIN`. `requireRole` middleware checks JWT role, `attachDbUser` checks `isActive` + role drift (forces re-login).
- **Secrets**: never committed. `.env` gitignored. Generate `JWT_SECRET` via `crypto.randomBytes(48).toString('hex')`. Rotate by setting new env + redeploy – all existing access tokens expire in 15m.

## Checklist

- [ ] `DATABASE_URL` is pooled URL (Neon `?pgbouncer=true`). Keep `PG_POOL_MAX` small.
- [ ] `JWT_SECRET` rotated, >=32 chars, unique per env.
- [ ] `CORS_ORIGIN` set to exact frontend origins (e.g. `https://user.github.io,https://ffcs.example.com`) – no `*` in prod.
- [ ] `NODE_ENV=production` enables error masking (500 → generic).
- [ ] Seed admin password changed after `pnpm db:seed` (or set `SEED_ADMIN_PASSWORD` env then delete var).
- [ ] Run `pnpm audit`, `pnpm typecheck` in CI.

## Incident

- Revoke leaked refresh: `DELETE FROM "RefreshToken" WHERE "userId"='...'` or hit `/api/auth/logout` with its `refreshToken`.
- Force re-login all: rotate `JWT_SECRET`.
