# FFCS Frontend – Free Static Deploy

This frontend is `output: 'export'` – pure static HTML/CSS/JS in `out/` after `pnpm build`. Deploy **free** on:

## GitHub Pages (recommended – matches `_.github/workflows/deploy.yml`)

1. Repo Settings → Pages → Source: GitHub Actions
2. Add repo secret `NEXT_PUBLIC_API_URL` = your backend URL (e.g. `https://ffcs-backend.onrender.com`)
3. Push to `main` – workflow builds with `NEXT_PUBLIC_API_URL` and uploads `out/` via `actions/deploy-pages`.

For user/org pages (`user.github.io`), set `basePath` in `next.config.ts` if needed and use `trailingSlash: true` (already).

## Cloudflare Pages (free, same)

- Build command: `pnpm build`
- Output directory: `out`
- Env: `NEXT_PUBLIC_API_URL`

## Netlify / Vercel static

- Same build, publish `out`. No functions needed.

## Local preview

```bash
pnpm build && npx serve out   # or `pnpm dlx serve out`
```

## Backend URL

Set `NEXT_PUBLIC_API_URL` at **build time** (baked into static JS). Changing it requires re-building/re-deploying.
