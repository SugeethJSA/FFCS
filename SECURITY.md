# FFCS Frontend – Security Notes

Static Next.js (`output: 'export'`) – no server secrets ever shipped.

- **No `DATABASE_URL`, `JWT_SECRET` on client**. Only `NEXT_PUBLIC_API_URL` (public).
- **Auth storage**: JWT access + refresh in `localStorage` (`ffcs_access`, `ffcs_refresh`) – required for static export (no httpOnly cookie without SSR). Mitigations: short-lived access (15m), hashed refresh in DB, auto-refresh queue, `clearTokens()` on 401/refresh failure. For higher security (if you later add SSR), switch to httpOnly `SameSite=Strict` cookies + `credentials:'include'`.
- **XSS**: AmazeUI + React escapes by default. No `dangerouslySetInnerHTML` except `react-markdown` with `remark-gfm` (sanitized). CSP via backend `helmet`; you can add `Content-Security-Policy` meta in `layout.tsx` if self-hosting with headers.
- **CORS**: frontend never bypasses backend CORS – requests go to `NEXT_PUBLIC_API_URL`.
- **Secrets in repo**: `.env` gitignored. Workflow uses `secrets.NEXT_PUBLIC_API_URL` – safe to be public (just an endpoint).
