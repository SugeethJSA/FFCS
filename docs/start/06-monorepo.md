# 06 — Monorepo: Deploy Independently, Develop Together

## Goal

Single `pnpm` workspace (like `trackit`) where `apps/web` (Next static), `apps/api` (Express), `apps/extension`, `apps/desktop` (Tauri) share `packages/*` but **each deploys solo**:

* `apps/web` → Vercel / Cloudflare Pages / GitHub Pages (`out/`)
* `apps/api` → Render / Fly / Railway (Docker / `node dist/index.js`) with `DATABASE_URL` Postgres
* `apps/extension` → Chrome Web Store (zip)
* `apps/desktop` → GitHub Releases (`msi/dmg`)

## Structure

```
FFCS/                          ← monorepo root (was current FFCS)
  apps/
    web/                       ← current FFCS frontend (src, public, next.config.ts)
      src/
      public/
      package.json  (name: "web")
      next.config.ts (output:'export')
      vercel.json
    api/                       ← current FFCS-backend (src, prisma, Dockerfile)
      src/
      prisma/
      package.json  (name: "api")
      Dockerfile, render.yaml, vercel.json
    extension/                 ← ffcs-extension (manifest.json, attendance.js)
      manifest.json
      attendance.js
      save.js
    desktop/                   ← ffcs-desktop (src-tauri, src)
      src-tauri/tauri.conf.json
  packages/
    tsconfig/  base.json
    eslint-config/  index.mjs
  pnpm-workspace.yaml          ← packages: ["apps/*","packages/*"]
  turbo.json                   ← build/dev/lint per app
  package.json (root)          ← scripts: turbo dev/build
  docs/  (kept at root)        ← start/00-05, sample-ffcs.csv
  .github/workflows/           ← release-desktop.yml, deploy-web.yml
  pnpm-lock.yaml (single)
```

## Why independent deploys still work

* **Vercel** — set Root Directory `apps/web` (`vercel.json` or dashboard), `NEXT_PUBLIC_API_URL` env points to `api` URL.
* **Render** — `apps/api/render.yaml` `rootDir: apps/api`, `DATABASE_URL` Postgres, `CORS_ORIGIN` = web URL.
* **Extension/Desktop** — built from `apps/extension` / `apps/desktop` independently, no server.

Turborepo handles `dependsOn: ["^build"]` but deploys only call `pnpm --filter web build` etc.

## Migration steps (executed by script)

1. `mkdir -p apps/web apps/api apps/extension apps/desktop packages/tsconfig packages/eslint-config`
2. `mv FFCS/src FFCS/public FFCS/next.config.ts FFCS/next-env.d.ts FFCS/postcss.config.mjs FFCS/tsconfig.json FFCS/eslint.config.mjs FFCS/package.json → apps/web/` (keep root `docs`, `.github`, `ffcs-*`, `out`, `node_modules` out)
3. `mv ../FFCS-backend/* → apps/api/` (incl. prisma, src, Dockerfile)
4. `mv FFCS/ffcs-extension/* → apps/extension/` ; `mv FFCS/ffcs-desktop/* → apps/desktop/`
5. Create `pnpm-workspace.yaml` (`packages: ["apps/*","packages/*"]`), `turbo.json` (like trackit), root `package.json` (`turbo dev/build/lint`), `packages/tsconfig/base.json`, `packages/eslint-config/index.mjs`
6. Update `apps/web/next.config.ts` `transpilePackages` if needed, `apps/api` Dockerfile `COPY` paths, `vercel.json` rootDir, `render.yaml` rootDir.
7. `rm -rf node_modules pnpm-lock.yaml` at root + apps, `pnpm install` (single lock), `pnpm typecheck`, `pnpm build` (turbo).

## Env handling

* `apps/web/.env` / `.env.example` → `NEXT_PUBLIC_API_URL=http://localhost:4000` → `apps/web/.env` stays, but root can also have `.env` for turbo passthrough (`globalDependencies: ["**/.env.*local"]`).
* `apps/api/.env` → `DATABASE_URL`, `JWT_SECRET`, `CORS_ORIGIN` (web URL).
* Turbo `globalDependencies` ensures env changes invalidate cache.

Next: execution below.
