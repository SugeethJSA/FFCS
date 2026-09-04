# 05 — Implementation Roadmap: Easy Peesy, Iterate Very Quickly

> **Principle:** Each phase is shippable in 2–4 days, demo-able to fellow admins, and doesn't block the next. Start with least overlap, most value.

---

## Phase 0 — Prep (Day 0, 2h)

- [ ] Create branch `feat/attendance` off `main` in both `FFCS` and `FFCS-backend`.
- [ ] Add `docs/start/` (this folder) to repo and link from `README.md` + `FFCS-backend/README.md`.
- [ ] Decide env: `NEXT_PUBLIC_API_URL` already exists (`FFCS/src/lib/api.ts:3`). Add `FFCS_FRONTEND_URL` to backend `.env.example` for extension origin allowlist.
- [ ] Install shared deps: `FFCS-backend: pnpm add papaparse @types/papaparse nanoid` (CSV + slug), `FFCS: pnpm add papaparse jspdf jspdf-autotable json-to-csv-export react-qr-reader mic-check`
- [ ] Verify `pnpm dev` still runs on `3004` + `4000`.

**Exit:** Team can `pnpm install && cp .env.example .env && pnpm dev` fresh.

---

## Phase 1 — FFCS Master Import + RegNo Identity (Days 1–3) *Highest leverage*

**Why first:** Without member profiles, attendance diff is meaningless.

**Backend:**
- [ ] Copy `parseRegNo.ts` (`02-data-model.md:3`) to `FFCS-backend/src/utils/parseRegNo.ts` + tests.
- [ ] Prisma: add `User.registerNo/vitEmail/school/programme/mobile/isToastmaster/club` + `MemberProfile` + `MemberImportBatch` (`02-data-model.md:4`). Generate migration: `pnpm db:migrate --name add_member_profile`, sync `schema.sqlite.prisma` + `schema.postgres.prisma`.
- [ ] Route `POST /api/admin/members/import` (`multipart/form-data`, `papaparse`, upsert logic `02-data-model.md:5`). Add `GET /api/admin/members?search=&limit=` for picker.
- [ ] Extend `POST /api/auth/register` to optional `registerNo` field (if vitstudent user supplies `Name 25BCE1234`, parse and store).
- [ ] Tests: upload `Programme,Register No,Name,School,Email,Mob No,Toastmaster,Club` 10-row CSV → check `MemberProfile` count + `User` linkage.

**Frontend:**
- [ ] `FFCS/src/app/admin/import/page.tsx` — drag-drop CSV (`@amazeui Card` + `Input type=file`), preview table (first 5 rows), `Import` → toast with `imported/updated/skipped`.
- [ ] `FFCS/src/app/admin/page.tsx` add card `Import FFCS List` linking there.

**Exit:** Admin uploads `ffcs-master.csv` → `/admin/import` shows `200 members` → `Leaderboard` can filter by `School/Club`.

---

## Phase 2 — In-Person QR (Days 4–7) *Trackit copy-paste, static-safe*

**Backend:**
- [ ] Models `AttendanceSession`, `AttendanceRecord`, `InPersonEvent`, `InPersonAttendee` (`02-data-model.md:4`) — `AttendanceSession` first, then `InPersonEvent` FK.
- [ ] Routes:
  - `POST /api/attendance/in-person` (ADMIN) create session + event slug (`nanoid 6` like `15e2b1`)
  - `GET /api/attendance/in-person/:slug` (public) — returns event + `hasRegistered/hasCheckedIn` if `Authorization` header present (mirrors `trackit/.../in-person/[slug]/page.tsx:43` logic but client-side)
  - `POST /api/attendance/in-person/:slug/register` (`optionalAuth`, domain check `allowedEmailDomains`)
  - `POST /api/attendance/in-person/:slug/checkin` (`ADMIN`, body `{userId, checkInTime}`)
  - `GET /api/attendance/session/:id` + `GET /api/attendance/session/:id/compare` (present/absent/unknown)
  - `POST /api/attendance/session/:id/close` (sets `endTime`)
- [ ] Reuse `upload-csv.tsx` papaparse for `allowedEmails` bulk via chip input.

**Frontend:**
- [ ] `FFCS/src/app/in-person/[slug]/page.tsx` (public, `"use client"` fetch via `apiFetch` — keeps export static, unlike Trackit server `dbClient`)
  - Subcomponents: `RegisterButton`, `QrDisplay` (fork `trackit/.../qr.tsx:18 next-qrcode`), `AlreadyCheckedIn` banner.
- [ ] `FFCS/src/app/admin/attendance/new/page.tsx` form (name, venue, date, allowed domains/emails CSV, category, points)
- [ ] `FFCS/src/app/admin/attendance/[id]/page.tsx` detail: `Info` table (reuse `trackit/.../in-person/[slug]/info.tsx:42` layout via `@amazeui`), `AttendeesTable` (`LeaderboardTable` variant), `Download CSV/PDF` (`json-to-csv-export` + `jspdf` like `trackit/.../download.tsx:37`), `Copy Link` (`navigator.clipboard`), `Scan` button → `/admin/attendance/scan`
- [ ] `FFCS/src/app/admin/attendance/scan/page.tsx` copy `trackit/.../scan/page.tsx:75 QrReader` + `mic-check` + `lastResult` dedupe, calls checkin API.
- [ ] `FFCS/src/app/admin/attendance/page.tsx` list sessions (`endTime null first` like `trackit/.../dashboard/in-person/page.tsx`)

**Exit:** Demo in-person flow end-to-end in `pnpm dev`: create `Auditorium` → share link → register second account → scan → see 1 present → `Award` → leaderboard updates.

---

## Phase 3 — Google Meet Engine (Days 8–12)

**Extension (new `FFCS/ffcs-extension/`):**
- [ ] Init `pnpm create wxt@latest ffcs-extension --template vanilla` inside `FFCS/`. Copy `trackit/apps/browser-extension/attendance.js:23` → `src/entrypoints/attendance.content.ts`, adapt selectors + add `parseMeetName` + JWT read from `chrome.storage.local` (`ffcs_access`). Change `window.open('https://trackit...')` → `fetch POST /api/attendance/meet`.
- [ ] `src/entrypoints/save.content.ts` bridge (keep but also try direct fetch; fallback to queue).
- [ ] `wxt.config.ts` manifest `matches: ["https://meet.google.com/*"]`, `permissions: ["storage"]`, icons rebrand.
- [ ] Add `src/utils/parseRegNo.ts` shared, `src/utils/api.ts` POST helper with retry.
- [ ] Build: `pnpm wxt dev` → load unpacked `ffcs-extension/.output/chrome-mv3` manually, test on a real Meet (2 participants).

**Backend:**
- [ ] `POST /api/attendance/meet` (`ADMIN`, body `{meetCode,date,startTime,stopTime,participants:[{rawName, registerNo, email, joinTime, leaveTime, attendedDuration}]}`) → upsert `AttendanceSession {type:MEET}` + `AttendanceRecord`s with `isPresent` threshold `0.5`.
- [ ] `POST /api/attendance/meet/import` (CSV upload, Google's export) → same upsert via `papaparse`.

**Frontend:**
- [ ] Extend `FFCS/src/app/admin/attendance/[id]/page.tsx` to handle `type:MEET` columns `Join/Leave/Duration %` (copy `trackit/src/components/dashboard/reports/report-table.tsx:63` `Progress` column).
- [ ] `FFCS/src/app/admin/attendance/page.tsx` add `Create Meet` tab.

**Exit:** Extension captures a 2-person test Meet → session shows `2 present` correctly parsed `25BCE...` → `Award`.

---

## Phase 4 — Compare & Bulk Award Polish (Days 13–15)

- [ ] Unified compare endpoint already handles both types — add filters `?programme=&school=&club=&toastmaster=` to `GET /api/attendance/session/:id/compare` so Toastmasters filter works.
- [ ] `POST /api/admin/award-bulk` (`ADMIN`, body `{sessionId, categorySlug, amount, reason, where, how}`) → transaction `point.createMany` + `totalPoints` increment, idempotency check `metadata.sessionId` unique per recipient. Add `GET /api/admin/attendance/session/:id/points` to show already awarded.
- [ ] Frontend compare tabs: `Present (scan/meet)`, `Absent (in FFCS but not present)`, `Unknown (not in FFCS)` with `Search` + `Programme/School` dropdown (reuse `LeaderboardTable` filter pattern). `Unknown` rows have `Link to member` picker (`GET /api/admin/members?search=`).
- [ ] CSV export for each tab (reuse `trackit download.tsx` helpers).
- [ ] Leaderboard tweak: `FFCS-backend/src/routes/leaderboard.ts:81` already supports `?category=` — add `?sessionId=` filter via `Point.metadata` (requires raw SQL for JSON filter on SQLite vs Postgres — abstract via `prisma.$queryRaw`).

**Exit:** Admin clicks `Award +10 Event to 23 present` → `Leaderboard` + `Dashboard` + `PointsTimeline` reflect instantly.

---

## Phase 5 — Packaging: Install Once (Days 16–20)

- [ ] Init `FFCS/ffcs-desktop/` `pnpm create tauri-app ffcs-desktop` (or `cargo create-tauri-app`), configure `tauri.conf.json` to load `http://localhost:3004` dev / `out/` prod (`04-desktop-browser-packaging.md:3`).
- [ ] Bundle extension: `ffcs-desktop/src-tauri/src/lib.rs` inject `ffcs-extension/.output/chrome-mv3` content scripts into webview on start.
- [ ] Auto-updater: `tauri-plugin-updater` + `latest.json` endpoint `FFCS-backend/src/routes/releases.ts` serving `https://ffcs.club/releases/latest.json` (S3 / GitHub Releases). Generate pubkey `tauri signer generate`.
- [ ] `FFCS/src/app/download/page.tsx` OS detection + buttons `Download for Windows / macOS / Linux` + `Add to Chrome` badge linking to store (if published).
- [ ] CI `.github/workflows/release-desktop.yml`: on `git tag v*` → `wxt zip` + `tauri build` → upload `msi/dmg/appimage` + `latest.json` to Releases.

**Fallback:** If Rust blocked, implement `ffcs-extension/scripts/launch-chrome.js` `chrome-launcher --load-extension` packaged via `pkg` (see `04:4`).

**Exit:** Fellow admin downloads `FFCS-Track-1.0.0.msi`, installs, sees tray icon, captures Meet without ever opening `chrome://extensions`.

---

## Phase 6 — Hardening & iteration (ongoing)

- [ ] Tracker selector hotfix: `GET /api/extension/config` returns `selectors` array admin can patch without extension update.
- [ ] Rate limits: `attendanceLimiter 30/min` (`FFCS-backend/src/lib/rateLimit.ts` mirror `awardLimiter`).
- [ ] E2E: Playwright test `meet capture → compare → award` vs fixture CSV with `25BCE...` RegNos.
- [ ] Docs: update `FFCS/README.md` routing table (`/admin/attendance`, `/in-person/[slug]`, `/download`) + `FFCS-backend/README.md` env (`CORS_ORIGIN`, `DATABASE_URL` dual).

---

## Suggested repo layout after

```
FFCS/
  docs/start/00..05.md
  src/app/admin/attendance/...  # new
  src/app/in-person/[slug]/... # new public
  src/app/download/page.tsx
ffcs-extension/                 # new wxt
ffcs-desktop/                   # new tauri
FFCS-backend/
  prisma/schema.prisma (+ members/attendance)
  src/routes/attendance.ts
  src/routes/members.ts
  src/utils/parseRegNo.ts
```

Start with `Phase 1` branch — review this plan, then `pnpm db:migrate` + `POST /api/admin/members/import` first.
